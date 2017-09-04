/// <reference path="../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../node_modules/@types/should/index.d.ts" />

import * as path from 'path';
import * as assert from 'assert';
import FileRepo from '../lib';

async function loadAndCompare(repo: FileRepo, name: string, expectedText: string) {
    const actualText = await repo.load(name);
    assert.equal(actualText, expectedText);
}

describe('FileRepo', () => {
    it('should throw an error if baseDir does not exist', async function () {
        assert.throws(() => {
            const repo = new FileRepo({
                baseDir: path.join(__dirname, 'some-dir-that-does-not-exist'),
            });
        })
    });

    it('should throw an error if baseDir is not a directory', async function () {
        assert.throws(() => {
            const repo = new FileRepo({
                baseDir: path.join(__dirname, 'index.ts'),
            });
        })
    });

    const repo = new FileRepo({
        baseDir: path.join(__dirname, 'sql'),
        suffix: '.sql',
    });

    it('should load files', async function () {
        await loadAndCompare(repo, 'test', 'SELECT 1 AS x\n');
    });

    it('should give errors when files do not exist', async function () {
        repo.load('bad-file-name')
            .then(function () {
                return Promise.reject('An error should have been thrown')
            })
            .catch(function (err) {
                return Promise.resolve();
            });
    });
});

describe('FileRepo with substituion enabled', () => {
    const repo = new FileRepo({
        baseDir: path.join(__dirname, 'sql'),
        suffix: '.sql',
        parseReferences: true,
    });

    it('should load files', async function () {
        await loadAndCompare(repo, 'test', 'SELECT 1 AS x\n');
    });

    it('should load nested files', async function () {
        const expected = [
            '-- Bam',
            'SELECT t.id',
            'FROM bam t',
        ].join('\n') + '\n';
        await loadAndCompare(repo, 'foo/bam', expected);
    });

    it('should replace references in files', async function () {
        await loadAndCompare(repo, 'test-sub', 'SELECT 1 AS x\nWHERE 1 = 2\n');
    });

    it('should replace nested references in files', async function () {
        const expected = [
            '-- Complex',
            '-- Baz',
            '-- Bam',
            'SELECT t.id',
            'FROM bam t',
        ].join('\n') + '\n';
        await loadAndCompare(repo, 'complex', expected);
    });
});
