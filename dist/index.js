"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const cors_1 = __importDefault(require("cors"));
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
const port = 3000;
app.use(express_1.default.json());
app.use((0, cors_1.default)());
// Business Central OAuth Credentials
const tenantId = "e9d91e13-dd6a-4891-8ef0-ce0c53035058";
const clientId = "7a44e5a4-1dde-404e-8ff3-0d299bcd8f80";
const clientSecret = "1hV8Q~JvTeBUy0lKgfHfwmj9IbK_jI.Ht~bpobdR";
const scope = "https://api.businesscentral.dynamics.com/.default";
const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
// Function to Get Access Token
async function getAccessToken() {
    try {
        const response = await axios_1.default.post(authUrl, new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            scope: scope,
            grant_type: "client_credentials"
        }));
        return response.data.access_token;
    }
    catch (error) {
        console.error("Error getting access token:", error.response?.data || error.message);
        throw new Error("Failed to retrieve access token");
    }
}
// Function to Fetch Car Brands
async function fetchCarBrands() {
    const token = await getAccessToken();
    const response = await axios_1.default.get("https://api.businesscentral.dynamics.com/v2.0/Test/api/bctech/demo/v1.0/companies(bd455158-5308-f011-9af6-6045bde98bac)/carBrands", {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
}
// Function to Fetch Car Models
async function fetchCarModels() {
    const token = await getAccessToken();
    const response = await axios_1.default.get("https://api.businesscentral.dynamics.com/v2.0/Test/api/bctech/demo/v1.0/companies(bd455158-5308-f011-9af6-6045bde98bac)/carModels", {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
}
// Initialize MCP Server
const server = new mcp_js_1.McpServer({
    name: "n1mcp-businesscentral",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});
// Register MCP Tools
server.tool("getCarBrands", "Fetches car brands from Business Central", {}, async (_args, _extra) => {
    const data = await fetchCarBrands();
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
});
server.tool("getCarModels", "Fetches car models from Business Central", {}, async (_args, _extra) => {
    const data = await fetchCarModels();
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
});
// HTTP endpoints for MCP tools
app.get('/mcp/getCarBrands', async (req, res) => {
    try {
        const data = await fetchCarBrands();
        res.json({ result: data });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/mcp/getCarModels', async (req, res) => {
    try {
        const data = await fetchCarModels();
        res.json({ result: data });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// SSE endpoint for MCP events
app.get('/mcp/events', (req, res) => {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    res.flushHeaders();
    // Example: send a message every 5 seconds
    const interval = setInterval(() => {
        res.write(`data: ${JSON.stringify({ time: new Date() })}\n\n`);
    }, 5000);
    req.on('close', () => {
        clearInterval(interval);
        res.end();
    });
});
// HTTPS server options
const options = {
    key: fs_1.default.readFileSync('path/to/server.key'),
    cert: fs_1.default.readFileSync('path/to/server.crt')
};
// Start HTTPS server
https_1.default.createServer(options, app).listen(port, () => {
    console.log(`HTTPS MCP Server running at https://<your-ip>:${port}/mcp`);
});
// Start MCP server (stdio)
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("N1MCP Business Central MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
// OpenAPI Specification
const openApiSpec = {
  "openapi": "3.0.1",
  "info": {
    "title": "Business Central MCP API",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://mn3hcnps-3000.inc1.devtunnels.ms/mcp"
    }
  ],
  "paths": {
    "/getCarBrands": {
      "get": {
        "summary": "Get Car Brands",
        "responses": {
          "200": {
            "description": "Car brands list",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          }
        }
      }
    },
    "/getCarModels": {
      "get": {
        "summary": "Get Car Models",
        "responses": {
          "200": {
            "description": "Car models list",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          }
        }
      }
    }
  }
};
