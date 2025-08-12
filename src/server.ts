#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import minimist from 'minimist';
import axios from "axios";
import { config as dotenvConfig } from "dotenv";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Load environment variables
dotenvConfig();

// Define tool schemas
const TOOLS = [
  {
    name: 'login',
    description: 'Authenticate with Openprovider and get a token',
    method: 'POST',
    path: '/auth/login',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Openprovider username',
        },
        password: {
          type: 'string',
          description: 'Openprovider password',
        },
      },
      required: [],
    },
  },
  {
    name: 'check_domain',
    description: 'Check domain availability',
    method: 'POST',
    path: '/domains/check',
    inputSchema: {
      type: 'object',
      properties: {
        domains: {
          type: 'array',
          description: 'List of domains to check',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Domain name without extension',
              },
              extension: {
                type: 'string',
                description: 'Domain extension (TLD)',
              },
            },
            required: ['name', 'extension'],
          },
        },
        with_price: {
          type: 'boolean',
          description: 'Include price information',
          default: true,
        },
      },
      required: ['domains'],
    },
  },
  {
    name: 'register_domain',
    description: 'Register a new domain',
    method: 'POST',
    path: '/domains',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Domain name without extension',
            },
            extension: {
              type: 'string',
              description: 'Domain extension (TLD)',
            },
          },
          required: ['name', 'extension'],
        },
        period: {
          type: 'number',
          description: 'Registration period in years',
          default: 1,
        },
        owner_handle: {
          type: 'string',
          description: 'Owner contact handle',
        },
        admin_handle: {
          type: 'string',
          description: 'Administrative contact handle',
        },
        tech_handle: {
          type: 'string',
          description: 'Technical contact handle',
        },
        billing_handle: {
          type: 'string',
          description: 'Billing contact handle',
        },
        name_servers: {
          type: 'array',
          description: 'List of nameservers',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Nameserver hostname',
              },
              ip: {
                type: 'string',
                description: 'Nameserver IP address',
              },
              ip6: {
                type: 'string',
                description: 'Nameserver IPv6 address',
              },
            },
            required: ['name'],
          },
        },
        ns_group: {
          type: 'string',
          description: 'Nameserver group',
        },
        use_domicile: {
          type: 'boolean',
          description: 'Use domicile service',
          default: false,
        },
        is_private_whois_enabled: {
          type: 'boolean',
          description: 'Enable private WHOIS',
          default: false,
        },
        is_dnssec_enabled: {
          type: 'boolean',
          description: 'Enable DNSSEC',
          default: false,
        },
        autorenew: {
          type: 'string',
          description: 'Auto-renewal setting (on, off, default)',
          default: 'default',
        },
      },
      required: ['domain', 'period', 'owner_handle'],
    },
  },
  {
    name: 'list_domains',
    description: 'List domains in your Openprovider account',
    method: 'GET',
    path: '/domains',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of domains to return',
          default: 100,
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination',
          default: 0,
        },
        status: {
          type: 'string',
          description: 'Filter by domain status',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_domain',
    description: 'Get domain details',
    method: 'GET',
    path: '/domains/{id}',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Domain ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_contacts',
    description: 'List contacts in your Openprovider account',
    method: 'GET',
    path: '/contacts',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of contacts to return',
          default: 100,
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination',
          default: 0,
        },
      },
      required: [],
    },
  },
  {
    name: 'create_contact',
    description: 'Create a new contact',
    method: 'POST',
    path: '/contacts',
    inputSchema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'Contact email address',
        },
        name: {
          type: 'object',
          description: 'Contact name',
          properties: {
            first_name: {
              type: 'string',
              description: 'First name',
            },
            last_name: {
              type: 'string',
              description: 'Last name',
            },
          },
          required: ['first_name', 'last_name'],
        },
        phone: {
          type: 'object',
          description: 'Contact phone',
          properties: {
            country_code: {
              type: 'string',
              description: 'Country code',
            },
            area_code: {
              type: 'string',
              description: 'Area code',
            },
            subscriber_number: {
              type: 'string',
              description: 'Subscriber number',
            },
          },
          required: ['country_code', 'subscriber_number'],
        },
        address: {
          type: 'object',
          description: 'Contact address',
          properties: {
            street: {
              type: 'string',
              description: 'Street',
            },
            number: {
              type: 'string',
              description: 'House number',
            },
            city: {
              type: 'string',
              description: 'City',
            },
            zipcode: {
              type: 'string',
              description: 'Zip code',
            },
            country: {
              type: 'string',
              description: 'Country code (2 letters)',
            },
          },
          required: ['street', 'city', 'zipcode', 'country'],
        },
        company_name: {
          type: 'string',
          description: 'Company name',
        },
      },
      required: ['email', 'name', 'phone', 'address'],
    },
  },
];

/**
 * MCP Server for Openprovider API
 */
class MCPServer {
  private server: any;
  private tools: Map<string, any>;
  private debug: boolean;
  private baseUrl: string;
  private headers: Record<string, string>;
  private authToken: string | null;
  constructor() {
    // Initialize class properties
    this.server = null;
    this.tools = new Map();
    this.debug = process.env.DEBUG === "true";
    this.baseUrl = process.env.API_BASE_URL || "https://api.openprovider.eu/v1beta";
    this.headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'openprovider-mcp-server/0.1.0',
    };
    this.authToken = null;

    // Initialize tools map - do this before creating server
    this.initializeTools();

    // Create MCP server with correct capabilities
    this.server = new Server(
      {
        name: "openprovider-mcp",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {}, // Enable tools capability
        },
      }
    );

    // Set up request handlers
    this.setupHandlers();
  }

  /**
   * Initialize tools map from defined tools
   */
  initializeTools() {
    // Initialize each tool in the tools map
    for (const tool of TOOLS) {
      this.tools.set(tool.name, {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      });
    }

    console.error(`Initialized ${this.tools.size} tools`);
  }

  /**
   * Set up request handlers
   */
  setupHandlers() {
    // Handle tool listing requests
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.log('debug', "Handling ListTools request");
      // Return tools in the format expected by MCP SDK
      return {
        tools: Array.from(this.tools.entries()).map(([id, tool]) => ({
          name: id,
          ...tool,
        })),
      };
    });

    // Handle tool execution requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: params } = request.params;
      this.log('debug', "Handling CallTool request", { name, params });

      let toolName;
      let toolDetails;

      // Find the requested tool
      for (const [tid, tool] of this.tools.entries()) {
        if (tid === name) {
          toolName = name;
          break;
        }
      }

      if (!toolName) {
        throw new Error(`Tool not found: ${name}`);
      }

      toolDetails = TOOLS.find(t => t.name === toolName);
      if (!toolDetails) {
        throw new Error(`Tool details not found for ID: ${toolName}`);
      }
        
      try {
        this.log('info', `Executing tool: ${toolName}`);

        // Special handling for login
        if (toolName === 'login') {
          const result = await this.handleLogin(toolDetails, params || {});
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result)
              }
            ]
          };
        }

        // For all other tools, ensure we have an auth token
        if (!this.authToken) {
          // Try to login using environment variables
          await this.handleLogin(TOOLS[0], {});
        }

        // Execute the API call
        const result = await this.executeApiCall(toolDetails, params || {});

        // Return the result in the correct MCP format
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result)
            }
          ]
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.log('error', `Error executing tool ${name}: ${errorMessage}`);

        throw error;
      }
    });
  }

  /**
   * Handle login specifically
   */
  async handleLogin(tool, params) {
    try {
      // Use environment variables if no credentials provided
      const username = params.username || process.env.OPENPROVIDER_USERNAME;
      const password = params.password || process.env.OPENPROVIDER_PASSWORD;

      if (!username || !password) {
        throw new Error('Username and password are required. Either provide them as parameters or set OPENPROVIDER_USERNAME and OPENPROVIDER_PASSWORD environment variables.');
      }

      const response = await axios({
        method: tool.method.toLowerCase(),
        url: `${this.baseUrl}${tool.path}`,
        headers: { ...this.headers },
        data: { username, password },
      });

      this.authToken = response.data.data.token;
      
      // Update headers with the auth token
      this.headers['Authorization'] = `Bearer ${this.authToken}`;

      return {
        success: true,
        message: 'Successfully authenticated with Openprovider',
        reseller_id: response.data.data.reseller_id,
      };
    } catch (error) {
      let errorMessage = 'Authentication error';
      
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = `Authentication error: ${error.response.data?.desc || error.message}`;
      } else if (error instanceof Error) {
        errorMessage = `Authentication error: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Execute an API call for a tool
   */
  async executeApiCall(tool, params) {
    // Get method and path from tool
    const method = tool.method;
    let path = tool.path;

    // Clone params to avoid modifying the original
    const requestParams = { ...params };

    // Replace path parameters with values from params
    Object.entries(requestParams).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      if (path.includes(placeholder)) {
        path = path.replace(placeholder, encodeURIComponent(String(value)));
        delete requestParams[key]; // Remove used parameter
      }
    });

    // Build the full URL
    const url = `${this.baseUrl}${path}`;

    this.log('debug', `API Request: ${method} ${url}`);

    try {
      // Configure the request
      const config: any = {
        method: method.toLowerCase(),
        url,
        headers: { ...this.headers },
        validateStatus: function (status) {
          return status < 500; // Resolve only if the status code is less than 500
        }
      };

      // Add parameters based on request method
      if (["GET", "DELETE"].includes(method)) {
        // For GET/DELETE, send params as query string
        config.params = { ...(config.params || {}), ...requestParams };
      } else {
        // For POST/PUT/PATCH, send params as JSON body
        config.data = requestParams;
      }

      this.log('debug', "Request config:", {
        url: config.url,
        method: config.method,
        params: config.params,
        headers: Object.keys(config.headers)
      });

      // Execute the request
      const response = await axios(config);
      this.log('debug', `Response status: ${response.status}`);

      return response.data;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log('error', `API request failed: ${errorMessage}`);

      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;
        const responseStatus = error.response?.status;

        this.log('error', 'API Error Details:', {
          status: responseStatus,
          data: typeof responseData === 'object' ? JSON.stringify(responseData) : responseData
        });

        // Rethrow with more context for better error handling
        const detailedError = new Error(`API request failed with status ${responseStatus}: ${errorMessage}`);
        throw detailedError;
      }

      throw error;
    }
  }

  /**
   * Log messages with appropriate level
   */
  log(level, message, data = null) {
    // Always log to stderr for visibility
    console.error(`[${level.toUpperCase()}] ${message}${data ? ': ' + JSON.stringify(data) : ''}`);
  }

  /**
   * Start the server
   */
  async startStdio() {
    try {
      // Create stdio transport
      const transport = new StdioServerTransport();
      console.error("MCP Server starting on stdio transport");

      // Connect to the transport
      await this.server.connect(transport);

      // Now we can safely log via MCP
      console.error(`Registered ${this.tools.size} tools`);
      this.log('info', `MCP Server with stdio transport started successfully with ${this.tools.size} tools`);
    } catch (error) {
      console.error("Failed to start MCP server:", error);
      process.exit(1);
    }
  }
}

// Start the server
async function main() {
  try {
    const argv = minimist(process.argv.slice(2), { 
        boolean: ['help'],
        default: {}
    });
        
    // Show help if requested
    if (argv.help) {
      console.log(`
        Openprovider MCP Server
        Usage: openprovider-mcp [options]
        Options:
          --help           Show this help message
        Environment Variables:
          OPENPROVIDER_USERNAME  Your Openprovider username (required)
          OPENPROVIDER_PASSWORD  Your Openprovider password (required)
          DEBUG                  Enable debug logging (true/false)
        `);
      process.exit(0);
    }
    
    const server = new MCPServer();
    await server.startStdio();
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();