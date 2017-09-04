import * as fs from 'fs';
import * as path from 'path';

function readTextFileAsync(filename: string, encoding: string): Promise<string> {
    return new Promise(function (resolve, reject) {
        fs.readFile(filename, encoding, function (err, data) {
            if (err) {
                return reject(err);
            }
            return resolve(data);
        });
    });
}

export interface ParsedReference {
    /**
     * Name of the referenced path in the local file repo.
     * 
     * Ex: 'foobar'
     */
    name: string;

    /**
     * Full text of the reference that will be replaced.
     * 
     * Ex: '${foobar}'
     */
    text: string;
}

export interface ParseReferenceFunc {
    (string): ParsedReference[];
}

export interface FileRepoOpts {
    /**
     * Base directory for tree of files
     * 
     * Ex: __dirname + '../sql'
     */
    baseDir: string;

    /**
     * Optional suffix to apply to loaded files.
     * Defaults to an empty string.
     * 
     * Ex: '.sql'
     */
    suffix?: string;

    /**
     * Optional caching of loaded files.
     * If disabled then files will be reloaded from disk upon each access.
     * Defaults to false.
     * 
     * Ex: process.env.NODE_ENV == 'production'
     */
    cache?: boolean;

    /**
     * Optional encoding for loaded text files.
     * Defaults to 'utf8'.
     */
    encoding?: string;

    /**
     * Whether to parse references.
     * 
     * Specifying true will use the default parser.
     * You can also specify a custom parser that should 
     * 
     * Default is false (off).
     */
    parseReferences?: boolean | ParseReferenceFunc;
}

const DEFAULT_FILE_REPO_OPTS: Partial<FileRepoOpts> = {
    suffix: '',
    cache: false,
    encoding: 'utf8',
    parseReferences: false,
}

// Regex to split ${NAME} style references
const REFERENCE_REGEX = /\$\{([\.\/a-zA-Z0-9\_\-]+)\}/;
function defaultParseReferences(text: string): ParsedReference[] {
    const references = {};
    for (const line of text.split('\n')) {
        const result = REFERENCE_REGEX.exec(line);
        if (result) {
            const reference = result[1];
            references[reference] = true;
        }
    }
    return Object.keys(references)
        .map(function (reference) {
            return {
                name: reference,
                text: '${' + reference + '}',
            };
        });
}

export default class FileRepo {
    private readonly baseDir: string;
    private readonly suffix: string;
    private readonly encoding: string;
    private readonly cache: {};
    private readonly parseReferences: ParseReferenceFunc;

    constructor(opts: FileRepoOpts) {
        opts = Object.assign({}, DEFAULT_FILE_REPO_OPTS, opts);
        if (!fs.existsSync(opts.baseDir)) {
            throw new Error('baseDir does not exist: ' + opts.baseDir);
        }
        const stat = fs.statSync(opts.baseDir);
        if (!stat.isDirectory()) {
            throw new Error('baseDir is not a directory: ' + opts.baseDir);
        }
        this.baseDir = opts.baseDir;
        this.suffix = opts.suffix;
        this.cache = opts.cache ? {} : null;
        this.encoding = opts.encoding;
        if (!opts.parseReferences) {
            this.parseReferences = null;
        } else if (opts.parseReferences === true) {
            this.parseReferences = defaultParseReferences;
        } else {
            this.parseReferences = opts.parseReferences;
        }
    }

    private loadRaw(name: string): Promise<string> {
        const filename = path.join(this.baseDir, name + this.suffix);
        return readTextFileAsync(filename, this.encoding);
    }

    private async loadInternal(name: string, depth: number): Promise<string> {
        if (this.cache && this.cache[name]) {
            return Promise.resolve(this.cache[name]);
        }
        const MAX_DEPTH = 10;
        if (depth >= MAX_DEPTH) {
            throw new Error('Exceeded maximum depth; HINT: Check if you have a loop in your references');
        }
        let text = await this.loadRaw(name);
        if (this.parseReferences) {
            // Parse to see if there are any references to be replaced
            const references = this.parseReferences(text);
            for (const reference of references) {
                // Name of the relative path file in the repo
                const referenceName = reference.name;
                // Load the evaluated reference
                const referenceValue = await this.loadInternal(path.join(path.dirname(name), referenceName), depth + 1);
                // Text of the reference that will be substituted
                const referenceText = reference.text;
                // First replace any references that terminate with newlines so that they don't get duplicated
                text = text.replace(referenceText + '\n', referenceValue);
                if (referenceValue.endsWith('\n')) {
                    text = text.replace(referenceText, referenceValue.substring(0, referenceValue.length - 1));
                } else {
                    // Then replace any remaining references
                    text = text.replace(referenceText, referenceValue);
                }
            }
        }
        if (this.cache && depth === 0) {
            // Cache is enabled so save text for next time
            this.cache[name] = text;
        }
        return text;
    }

    public async load(name: string): Promise<string> {
        return this.loadInternal(name, 0);
    }
}
