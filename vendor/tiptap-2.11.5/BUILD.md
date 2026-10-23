TipTap 2.11.5 bundle (MIT). Built 2026-10-23 with esbuild 0.24.0 from entry.js:
    export { Editor, Node } from '@tiptap/core';
    export { default as StarterKit } from '@tiptap/starter-kit';
    export { default as Placeholder } from '@tiptap/extension-placeholder';
    export { default as Link } from '@tiptap/extension-link';
    export { default as Image } from '@tiptap/extension-image';

Pinned packages:
    @tiptap/core@2.11.5
    @tiptap/extension-blockquote@2.11.5
    @tiptap/extension-bold@2.11.5
    @tiptap/extension-bullet-list@2.11.5
    @tiptap/extension-code-block@2.11.5
    @tiptap/extension-code@2.11.5
    @tiptap/extension-document@2.11.5
    @tiptap/extension-dropcursor@2.11.5
    @tiptap/extension-gapcursor@2.11.5
    @tiptap/extension-hard-break@2.11.5
    @tiptap/extension-heading@2.11.5
    @tiptap/extension-history@2.11.5
    @tiptap/extension-horizontal-rule@2.11.5
    @tiptap/extension-image@2.11.5
    @tiptap/extension-italic@2.11.5
    @tiptap/extension-link@2.11.5
    @tiptap/extension-list-item@2.11.5
    @tiptap/extension-ordered-list@2.11.5
    @tiptap/extension-paragraph@2.11.5
    @tiptap/extension-placeholder@2.11.5
    @tiptap/extension-strike@2.11.5
    @tiptap/extension-text-style@2.11.5
    @tiptap/extension-text@2.11.5
    @tiptap/pm@2.11.5
    @tiptap/starter-kit@2.11.5
    linkifyjs@4.4.0
    markdown-it@14.2.0
    markdown-it@14.3.3
    orderedmap@2.1.1
    prosemirror-changeset@2.4.4
    prosemirror-collab@1.3.1
    prosemirror-commands@1.7.2
    prosemirror-dropcursor@1.8.4
    prosemirror-gapcursor@1.4.1
    prosemirror-history@1.5.1
    prosemirror-inputrules@1.5.1
    prosemirror-keymap@1.2.3
    prosemirror-markdown@1.13.9
    prosemirror-menu@1.3.2
    prosemirror-model@1.25.12
    prosemirror-schema-basic@1.2.5
    prosemirror-schema-list@1.5.1
    prosemirror-state@1.4.4
    prosemirror-tables@1.8.5
    prosemirror-trailing-node@3.0.0
    prosemirror-transform@1.12.4
    prosemirror-view@1.42.7
    rope-sequence@1.3.4
    w3c-keyname@2.2.8

Rebuild: npm i (package.json pins every @tiptap/* to 2.11.5 via overrides), then
    npx esbuild entry.js --bundle --format=esm --minify --legal-comments=eof --target=es2019 --outfile=tiptap.min.js

package.json used:
    {
      "name": "tiptap-build",
      "version": "1.0.0",
      "description": "",
      "main": "index.js",
      "scripts": {
        "test": "echo \"Error: no test specified\" && exit 1"
      },
      "keywords": [],
      "author": "",
      "license": "ISC",
      "type": "commonjs",
      "dependencies": {
        "@tiptap/core": "2.11.5",
        "@tiptap/extension-image": "2.11.5",
        "@tiptap/extension-link": "2.11.5",
        "@tiptap/extension-placeholder": "2.11.5",
        "@tiptap/pm": "2.11.5",
        "@tiptap/starter-kit": "2.11.5",
        "esbuild": "^0.24.0"
      },
      "overrides": {
        "@tiptap/core": "$@tiptap/core",
        "@tiptap/extension-blockquote": "2.11.5",
        "@tiptap/extension-bold": "2.11.5",
        "@tiptap/extension-bullet-list": "2.11.5",
        "@tiptap/extension-code": "2.11.5",
        "@tiptap/extension-code-block": "2.11.5",
        "@tiptap/extension-document": "2.11.5",
        "@tiptap/extension-dropcursor": "2.11.5",
        "@tiptap/extension-gapcursor": "2.11.5",
        "@tiptap/extension-hard-break": "2.11.5",
        "@tiptap/extension-heading": "2.11.5",
        "@tiptap/extension-history": "2.11.5",
        "@tiptap/extension-horizontal-rule": "2.11.5",
        "@tiptap/extension-italic": "2.11.5",
        "@tiptap/extension-list-item": "2.11.5",
        "@tiptap/extension-ordered-list": "2.11.5",
        "@tiptap/extension-paragraph": "2.11.5",
        "@tiptap/extension-strike": "2.11.5",
        "@tiptap/extension-text": "2.11.5",
        "@tiptap/extension-text-style": "2.11.5",
        "@tiptap/pm": "$@tiptap/pm"
      }
    }