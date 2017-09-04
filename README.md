# file-repo

[![NPM](https://nodei.co/npm/file-repo.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/file-repo/)

[![Build Status](https://travis-ci.org/sehrope/node-file-repo.svg?branch=master)](https://travis-ci.org/sehrope/node-file-repo)

# Overview
Load text files, optionally referencing other text files.

Combined with async/await, this makes it very easy to access externalize text resources.

* [Install](#install)
* [Usage](#usage)
* [Features](#features)
* [Building and Testing](#building-and-testing)
* [License](#license)

# Install

    $ npm install file-repo --save

# Usage

    // Load the module (import style)
    import FileRepo from 'file-repo';
    // Load the module (require style)
    const FileRepo = require('file-repo').default;

    // Create a repo
    const repo = new FileRepo({
        baseDir: path.join(__dirname, 'sql'),
        suffix: 'sql',
        cache: true,
    });

    // Load sql/foo/my-query.sql
    const sql = await repo.load('foo/my-query');

# Dependencies

None!

# Features
* Natively promisified for easy async/await integration
* Supports nested relative pathed references via ${path/to/reference}
* Supports caching of loaded files so only read from disk once

# Building and Testing
To build the module run:

    $ make

Then, to run the tests run:

    $ make test

# License
ISC. See the file [LICENSE](LICENSE).
