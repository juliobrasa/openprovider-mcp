#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const API_BASE_URL = process.env.OPENPROVIDER_API_URL || 'https://api.openprovider.eu/v1beta';
const USERNAME = process.env.OPENPROVIDER_USERNAME;
const PASSWORD = process.env.OPENPROVIDER_PASSWORD;

// Types
interface DomainInfo {
  id?: number;
  name: string;
  extension: string;
}

interface NameServer {
  name: string;
  ip?: string | null;
  ip6?: string | null;
  seq_nr?: number;
}

// API Client Class
class OpenProviderClient {
  private api: AxiosInstance;
  private authToken: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async authenticate(username?: string, password?: string): Promise<string> {
    const user = username || USERNAME;
    const pass = password || PASSWORD;
    
    if (!user || !pass) {
      throw new Error('Username and password are required');
    }

    try {
      const response = await this.api.post('/auth/login', {
        username: user,
        password: pass,
      });

      this.authToken = response.data.data.token;
      this.api.defaults.headers.common['Authorization'] = `Bearer ${this.authToken}`;
      
      return this.authToken;
    } catch (error: any) {
      throw new Error(`Authentication failed: ${error.response?.data?.desc || error.message}`);
    }
  }

  async ensureAuthenticated(): Promise<void> {
    if (!this.authToken) {
      await this.authenticate();
    }
  }

  async listDomains(filters?: any): Promise<any> {
    await this.ensureAuthenticated();
    
    const params = new URLSearchParams();
    if (filters?.domain_name_pattern) {
      params.append('domain_name_pattern', filters.domain_name_pattern);
    }
    if (filters?.full_name) {
      params.append('full_name', filters.full_name);
    }
    if (filters?.extension) {
      params.append('extension', filters.extension);
    }
    
    const response = await this.api.get(`/domains?${params.toString()}`);
    return response.data;
  }

  async getDomain(domainName: string): Promise<any> {
    await this.ensureAuthenticated();
    
    // First try to find the domain to get its ID
    const searchResponse = await this.listDomains({ full_name: domainName });
    
    if (searchResponse.data?.results?.length > 0) {
      const domain = searchResponse.data.results[0];
      return { success: true, data: domain };
    }
    
    throw new Error(`Domain ${domainName} not found`);
  }

  async updateNameservers(domainName: string, nameservers: string[]): Promise<any> {
    await this.ensureAuthenticated();
    
    try {
      // Get domain info first to get the ID
      const domainInfo = await this.getDomain(domainName);
      const domainId = domainInfo.data.id;
      
      if (!domainId) {
        throw new Error('Domain ID not found');
      }

      // Format nameservers
      const formattedNs: NameServer[] = nameservers.map((ns, index) => ({
        name: ns,
        seq_nr: index,
        ip: null,
        ip6: null,
      }));

      // Update using domain ID
      const response = await this.api.put(`/domains/${domainId}`, {
        id: domainId,
        name_servers: formattedNs,
      });

      return { 
        success: true, 
        message: `Nameservers updated successfully for ${domainName}`,
        nameservers: nameservers,
        response: response.data 
      };
    } catch (error: any) {
      // If ID method fails, try with domain name
      if (error.response?.status === 400) {
        const [name, ...extensionParts] = domainName.split('.');
        const extension = extensionParts.join('.');
        
        const alternativeResponse = await this.api.put(`/domains/${domainName}`, {
          domain: { name, extension },
          name_servers: nameservers.map((ns, idx) => ({
            name: ns,
            seq_nr: idx,
          })),
        });
        
        if (alternativeResponse.status === 200) {
          return { 
            success: true, 
            message: `Nameservers updated successfully for ${domainName}`,
            nameservers: nameservers 
          };
        }
      }
      
      throw error;
    }
  }

  async checkDomain(domains: DomainInfo[]): Promise<any> {
    await this.ensureAuthenticated();
    
    const response = await this.api.post('/domains/check', {
      domains: domains,
      with_price: true,
    });
    
    return response.data;
  }

  async getDomainPrice(domain: DomainInfo): Promise<any> {
    await this.ensureAuthenticated();
    
    const response = await this.api.post('/domains/prices', {
      domains: [domain],
      operation: 'create',
    });
    
    return response.data;
  }

  async renewDomain(domainName: string, period: number = 1): Promise<any> {
    await this.ensureAuthenticated();
    
    const domainInfo = await this.getDomain(domainName);
    const domainId = domainInfo.data.id;
    
    const response = await this.api.post(`/domains/${domainId}/renew`, {
      period: period,
    });
    
    return response.data;
  }

  async getExpiringDomains(days: number = 60): Promise<any> {
    await this.ensureAuthenticated();
    
    const response = await this.listDomains({});
    const domains = response.data?.results || [];
    
    const now = new Date();
    const expiringDomains = domains.filter((domain: any) => {
      const expirationDate = new Date(domain.expiration_date);
      const daysUntilExpiration = Math.floor((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiration <= days && daysUntilExpiration >= 0;
    });
    
    return {
      success: true,
      count: expiringDomains.length,
      domains: expiringDomains.map((d: any) => ({
        name: `${d.domain.name}.${d.domain.extension}`,
        expiration_date: d.expiration_date,
        days_until_expiration: Math.floor((new Date(d.expiration_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        status: d.status,
        autorenew: d.autorenew,
      })),
    };
  }

  // DNS Zone Management
  async createDnsZone(domainName: string, template?: string): Promise<any> {
    await this.ensureAuthenticated();
    
    const [name, ...extensionParts] = domainName.split('.');
    const extension = extensionParts.join('.');
    
    const response = await this.api.post('/dns/zones', {
      domain: { name, extension },
      template: template,
      type: 'master',
    });
    
    return response.data;
  }

  async listDnsRecords(domainName: string): Promise<any> {
    await this.ensureAuthenticated();
    
    const response = await this.api.get(`/dns/zones/${domainName}/records`);
    return response.data;
  }

  async createDnsRecord(domainName: string, record: any): Promise<any> {
    await this.ensureAuthenticated();
    
    const response = await this.api.post(`/dns/zones/${domainName}/records`, record);
    return response.data;
  }

  async updateDnsRecord(domainName: string, recordId: number, record: any): Promise<any> {
    await this.ensureAuthenticated();
    
    const response = await this.api.put(`/dns/zones/${domainName}/records/${recordId}`, record);
    return response.data;
  }

  async deleteDnsRecord(domainName: string, recordId: number): Promise<any> {
    await this.ensureAuthenticated();
    
    const response = await this.api.delete(`/dns/zones/${domainName}/records/${recordId}`);
    return response.data;
  }

  // Transfer operations
  async transferDomain(domain: DomainInfo, authCode: string): Promise<any> {
    await this.ensureAuthenticated();
    
    const response = await this.api.post('/domains/transfer', {
      domain: domain,
      auth_code: authCode,
      period: 1,
    });
    
    return response.data;
  }

  async getTransferStatus(transferId: number): Promise<any> {
    await this.ensureAuthenticated();
    
    const response = await this.api.get(`/domains/transfer/${transferId}`);
    return response.data;
  }
}

// MCP Server Setup
class OpenProviderMCPServer {
  private server: Server;
  private client: OpenProviderClient;

  constructor() {
    this.client = new OpenProviderClient();
    this.server = new Server(
      {
        name: 'openprovider-enhanced-mcp',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'login',
          description: 'Authenticate with OpenProvider',
          inputSchema: {
            type: 'object',
            properties: {
              username: { type: 'string', description: 'Username (optional if env var set)' },
              password: { type: 'string', description: 'Password (optional if env var set)' },
            },
          },
        },
        {
          name: 'list_domains',
          description: 'List all domains in the account',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: { type: 'string', description: 'Domain name pattern to search' },
              extension: { type: 'string', description: 'Filter by extension' },
            },
          },
        },
        {
          name: 'get_domain',
          description: 'Get detailed information about a specific domain',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string', description: 'Full domain name (e.g., example.com)' },
            },
            required: ['domain'],
          },
        },
        {
          name: 'update_nameservers',
          description: 'Update nameservers for a domain',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string', description: 'Full domain name' },
              nameservers: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of nameserver hostnames',
              },
            },
            required: ['domain', 'nameservers'],
          },
        },
        {
          name: 'check_domain',
          description: 'Check domain availability and pricing',
          inputSchema: {
            type: 'object',
            properties: {
              domains: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    extension: { type: 'string' },
                  },
                  required: ['name', 'extension'],
                },
              },
            },
            required: ['domains'],
          },
        },
        {
          name: 'get_expiring_domains',
          description: 'Get list of domains expiring within specified days',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'number', description: 'Number of days (default: 60)' },
            },
          },
        },
        {
          name: 'renew_domain',
          description: 'Renew a domain',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string', description: 'Full domain name' },
              period: { type: 'number', description: 'Renewal period in years (default: 1)' },
            },
            required: ['domain'],
          },
        },
        {
          name: 'transfer_domain',
          description: 'Transfer a domain to OpenProvider',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string', description: 'Full domain name' },
              auth_code: { type: 'string', description: 'Transfer authorization code' },
            },
            required: ['domain', 'auth_code'],
          },
        },
        {
          name: 'create_dns_zone',
          description: 'Create a DNS zone for a domain',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string', description: 'Full domain name' },
              template: { type: 'string', description: 'DNS template name (optional)' },
            },
            required: ['domain'],
          },
        },
        {
          name: 'list_dns_records',
          description: 'List all DNS records for a domain',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string', description: 'Full domain name' },
            },
            required: ['domain'],
          },
        },
        {
          name: 'create_dns_record',
          description: 'Create a DNS record',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string', description: 'Full domain name' },
              type: { type: 'string', description: 'Record type (A, AAAA, CNAME, MX, TXT, etc.)' },
              name: { type: 'string', description: 'Record name' },
              value: { type: 'string', description: 'Record value' },
              ttl: { type: 'number', description: 'TTL in seconds' },
              priority: { type: 'number', description: 'Priority (for MX records)' },
            },
            required: ['domain', 'type', 'name', 'value'],
          },
        },
      ],
    }));

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'login':
            const token = await this.client.authenticate(args?.username as string, args?.password as string);
            return { content: [{ type: 'text', text: `Successfully authenticated. Token obtained.` }] };

          case 'list_domains':
            const domains = await this.client.listDomains({
              domain_name_pattern: args?.pattern,
              extension: args?.extension,
            });
            return { content: [{ type: 'text', text: JSON.stringify(domains, null, 2) }] };

          case 'get_domain':
            const domainInfo = await this.client.getDomain(args.domain as string);
            return { content: [{ type: 'text', text: JSON.stringify(domainInfo, null, 2) }] };

          case 'update_nameservers':
            const nsResult = await this.client.updateNameservers(args.domain as string, args.nameservers as string[]);
            return { content: [{ type: 'text', text: JSON.stringify(nsResult, null, 2) }] };

          case 'check_domain':
            const availability = await this.client.checkDomain(args.domains as DomainInfo[]);
            return { content: [{ type: 'text', text: JSON.stringify(availability, null, 2) }] };

          case 'get_expiring_domains':
            const expiring = await this.client.getExpiringDomains((args?.days as number) || 60);
            return { content: [{ type: 'text', text: JSON.stringify(expiring, null, 2) }] };

          case 'renew_domain':
            const renewed = await this.client.renewDomain(args.domain as string, (args?.period as number) || 1);
            return { content: [{ type: 'text', text: JSON.stringify(renewed, null, 2) }] };

          case 'transfer_domain':
            const domainStr = args.domain as string;
            const [name, ...ext] = domainStr.split('.');
            const transfer = await this.client.transferDomain(
              { name, extension: ext.join('.') },
              args.auth_code as string
            );
            return { content: [{ type: 'text', text: JSON.stringify(transfer, null, 2) }] };

          case 'create_dns_zone':
            const zone = await this.client.createDnsZone(args.domain as string, args?.template as string);
            return { content: [{ type: 'text', text: JSON.stringify(zone, null, 2) }] };

          case 'list_dns_records':
            const records = await this.client.listDnsRecords(args.domain as string);
            return { content: [{ type: 'text', text: JSON.stringify(records, null, 2) }] };

          case 'create_dns_record':
            const record = await this.client.createDnsRecord(args.domain as string, {
              type: args.type,
              name: args.name,
              value: args.value,
              ttl: args?.ttl || 3600,
              prio: args?.priority,
            });
            return { content: [{ type: 'text', text: JSON.stringify(record, null, 2) }] };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}\n${error.response?.data ? JSON.stringify(error.response.data, null, 2) : ''}`,
            },
          ],
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('OpenProvider Enhanced MCP Server running...');
  }
}

// Main
const server = new OpenProviderMCPServer();
server.run().catch(console.error);