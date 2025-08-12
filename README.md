# Openprovider MCP Server

This is a Model Context Protocol (MCP) server for Openprovider.com that allows users to interact with their Openprovider account to perform various domain management actions.

## Features

The Openprovider MCP server provides the following tools:

- **login**: Authenticate with Openprovider and get a token
- **check_domain**: Check domain availability
- **register_domain**: Register a new domain
- **list_domains**: List domains in your Openprovider account
- **get_domain**: Get domain details
- **list_contacts**: List contacts in your Openprovider account
- **create_contact**: Create a new contact

## Installation

1. Clone this repository
   ```
   git clone git@github.com:hichamdotpage/openprovider-mcp.git
   cd openprovider-mcp
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Build the project:
   ```
   npm run build
   ```

4. Test the server:
   ```
   npm test
   ```

## Configuration

### Environment Variables

The server can be configured using environment variables. Create a `.env` file in the root directory based on the provided `.env.example`:

```
# Openprovider API Credentials
OPENPROVIDER_USERNAME=your_username
OPENPROVIDER_PASSWORD=your_password

# Debug mode (true/false)
DEBUG=false
```

## Usage

Once configured, you can use the Openprovider MCP server with Claude, ChatGPT, Cursor or any other platform that supports the Model Context Protocol.

### Example: Checking Domain Availability

```
<use_mcp_tool>
<server_name>openprovider</server_name>
<tool_name>check_domain</tool_name>
<arguments>
{
  "domains": [
    {
      "name": "example",
      "extension": "com"
    },
    {
      "name": "example",
      "extension": "org"
    }
  ],
  "with_price": true
}
</arguments>
</use_mcp_tool>
```

### Example: Registering a Domain

```
<use_mcp_tool>
<server_name>openprovider</server_name>
<tool_name>register_domain</tool_name>
<arguments>
{
  "domain": {
    "name": "example",
    "extension": "com"
  },
  "period": 1,
  "owner_handle": "ABC123",
  "name_servers": [
    {
      "name": "ns1.example.com"
    },
    {
      "name": "ns2.example.com"
    }
  ]
}
</arguments>
</use_mcp_tool>
```

## Documentation

Detailed documentation for all available tools can be found in the `docs` directory:

- [Tools Documentation](docs/tools.md): Detailed information about each tool, including input schemas, examples, and responses.
- [Troubleshooting Guide](docs/troubleshooting.md): Solutions to common issues you might encounter when using the Openprovider MCP server.

## Examples

The repository includes example scripts that demonstrate how to use the Openprovider MCP server:

### Domain Check Example

This example demonstrates how to check domain availability:

```
npm run example:check
```

### Domain Registration Example

This example demonstrates how to register a new domain:

```
npm run example:register
```

## Integration with Workflows

This MCP server can be used with workflow automation platforms like n8n to implement complex domain management workflows. The server exposes a standardized interface that can be accessed programmatically.

The examples in the `examples` directory show how to integrate with the MCP server programmatically using Node.js.

### n8n Workflow Example

An example n8n workflow is provided in the `examples/n8n-workflow.json` file. This workflow demonstrates how to:

1. Check domain availability
2. Display domain status and pricing
3. List contacts if the domain is available

To use this workflow:

1. Import the workflow JSON file into your n8n instance
2. Set up environment variables for `OPENPROVIDER_USERNAME` and `OPENPROVIDER_PASSWORD`
3. Make sure the Openprovider MCP server is running locally
4. Activate and run the workflow

![n8n Workflow Example](https://i.imgur.com/example.png)

## Contributing

We welcome contributions to the Openprovider MCP Server! Please see the [Contributing Guide](CONTRIBUTING.md) for more information on how to get started.

## About Openprovider

Openprovider is a wholesaler of Internet services and products with a unique platform from which you can find and manage all the products you need: Domains, new gTLDs, SSL certificates, licenses for Plesk, spam filters, and more!

For more information, visit [Openprovider.com](https://www.openprovider.com/).

## Repository

The source code for this project is available on GitHub:
```
git@github.com:hichamdotpage/openprovider-mcp.git
```

You can view the repository at [https://github.com/hichamdotpage/openprovider-mcp](https://github.com/hichamdotpage/openprovider-mcp)

## License

This project is licensed under the MIT License - see the LICENSE file for details.