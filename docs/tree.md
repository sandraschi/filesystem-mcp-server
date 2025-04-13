# filesystem-mcp-server - Directory Structure

Generated on: 2025-04-13 04:19:44


```
filesystem-mcp-server
├── backups
├── docs
    └── tree.md
├── scripts
    ├── clean.ts
    └── tree.ts
├── src
    ├── config
    │   └── index.ts
    ├── mcp-server
    │   ├── tools
    │   │   ├── copyPath
    │   │   │   ├── copyPathLogic.ts
    │   │   │   ├── index.ts
    │   │   │   └── registration.ts
    │   │   ├── createDirectory
    │   │   │   ├── createDirectoryLogic.ts
    │   │   │   ├── index.ts
    │   │   │   └── registration.ts
    │   │   ├── deleteDirectory
    │   │   │   ├── deleteDirectoryLogic.ts
    │   │   │   ├── index.ts
    │   │   │   └── registration.ts
    │   │   ├── deleteFile
    │   │   │   ├── deleteFileLogic.ts
    │   │   │   ├── index.ts
    │   │   │   └── registration.ts
    │   │   ├── listFiles
    │   │   │   ├── index.ts
    │   │   │   ├── listFilesLogic.ts
    │   │   │   └── registration.ts
    │   │   ├── movePath
    │   │   │   ├── index.ts
    │   │   │   ├── movePathLogic.ts
    │   │   │   └── registration.ts
    │   │   ├── readFile
    │   │   │   ├── index.ts
    │   │   │   ├── readFileLogic.ts
    │   │   │   └── registration.ts
    │   │   ├── setFilesystemDefault
    │   │   │   ├── index.ts
    │   │   │   ├── registration.ts
    │   │   │   └── setFilesystemDefaultLogic.ts
    │   │   ├── updateFile
    │   │   │   ├── index.ts
    │   │   │   ├── registration.ts
    │   │   │   └── updateFileLogic.ts
    │   │   └── writeFile
    │   │   │   ├── index.ts
    │   │   │   ├── registration.ts
    │   │   │   └── writeFileLogic.ts
    │   ├── server.ts
    │   └── state.ts
    ├── types-global
    │   ├── errors.ts
    │   ├── mcp.ts
    │   └── tool.ts
    ├── utils
    │   ├── errorHandler.ts
    │   ├── idGenerator.ts
    │   ├── index.ts
    │   ├── logger.ts
    │   ├── rateLimiter.ts
    │   ├── requestContext.ts
    │   └── sanitization.ts
    └── index.ts
├── .clinerules
├── LICENSE
├── package-lock.json
├── package.json
├── README.md
├── repomix.config.json
└── tsconfig.json

```

_Note: This tree excludes files and directories matched by .gitignore and common patterns like node_modules._
