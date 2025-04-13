# filesystem-mcp-server - Directory Structure

Generated on: 2025-04-13 02:00:27


```
filesystem-mcp-server
├── backups
├── docs
    └── tree.md
├── logs
├── scripts
    ├── clean.ts
    └── tree.ts
├── src
    ├── config
    │   └── index.ts
    ├── mcp-server
    │   ├── tools
    │   │   └── readFile
    │   │   │   ├── index.ts
    │   │   │   ├── readFileLogic.ts
    │   │   │   └── registration.ts
    │   └── server.ts
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
