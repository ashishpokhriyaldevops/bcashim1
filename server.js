require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { MCPServer } = require('@modelcontextprotocol/server');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

// Business Central OAuth Credentials
const tenantId = process.env.BC_TENANT_ID;
const clientId = process.env.BC_CLIENT_ID;
const clientSecret = process.env.BC_CLIENT_SECRET;
const scope = process.env.BC_SCOPE;
const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

// Function to Get Access Token
async function getAccessToken()
{
    try
    {
        const response = await axios.post(authUrl, new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            scope: scope,
            grant_type: "client_credentials"
        }));
        return response.data.access_token;
    } catch (error)
    {
        console.error("Error getting access token:", error.response?.data || error.message);
        throw new Error("Failed to retrieve access token");
    }
}

// Function to Fetch Car Brands
async function fetchCarBrands()
{
    const token = await getAccessToken();
    const response = await axios.get("https://api.businesscentral.dynamics.com/v2.0/Test/api/bctech/demo/v1.0/companies(bd455158-5308-f011-9af6-6045bde98bac)/carBrands", {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
}

// Function to Fetch Car Models
async function fetchCarModels()
{
    const token = await getAccessToken();
    const response = await axios.get("https://api.businesscentral.dynamics.com/v2.0/Test/api/bctech/demo/v1.0/companies(bd455158-5308-f011-9af6-6045bde98bac)/carModels", {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
}

// Initialize MCP Server
const mcpServer = new MCPServer();

// Add MCP Tools
mcpServer.addTool({
    name: "getCarBrands",
    description: "Fetches car brands from Business Central",
    execute: fetchCarBrands
});

mcpServer.addTool({
    name: "getCarModels",
    description: "Fetches car models from Business Central",
    execute: fetchCarModels
});

// HTTP Event Listener for MCP
app.post('/mcp/event', async (req, res) =>
{
    const { eventType } = req.body;

    try
    {
        if (eventType === "fetchCarBrands")
        {
            const data = await fetchCarBrands();
            res.json({ event: "fetchCarBrands", data });
        } else if (eventType === "fetchCarModels")
        {
            const data = await fetchCarModels();
            res.json({ event: "fetchCarModels", data });
        } else
        {
            res.status(400).json({ error: "Unknown event type" });
        }
    } catch (error)
    {
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
});

// Secure API Requests with an API Key (move before all routes)
app.use((req, res, next) =>
{
    const apiKey = req.headers["x-api-key"];
    if (apiKey !== process.env.API_KEY)
    {
        return res.status(403).json({ error: "Unauthorized" });
    }
    next();
});

// Start Express server
app.use('/mcp', mcpServer.middleware());
app.listen(port, () =>
{
    console.log(`MCP Server running at http://localhost:${port}/mcp`);
});
