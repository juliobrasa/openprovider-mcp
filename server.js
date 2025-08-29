#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import minimist from 'minimist';
import axios from "axios";
import { config as dotenvConfig } from "dotenv";
import { ListToolsRequestSchema, CallToolRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
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
                additional_data: {
                    type: 'object',
                    description: 'Additional contact data',
                    properties: {
                        birth_city: {
                            type: 'string',
                            description: 'Birth city',
                        },
                        birth_date: {
                            type: 'string',
                            description: 'Birth date (YYYY-MM-DD format)',
                        },
                        social_security_number: {
                            type: 'string',
                            description: 'Social security number',
                        },
                    },
                },
                address: {
                    type: 'object',
                    description: 'Contact address',
                    properties: {
                        city: {
                            type: 'string',
                            description: 'City',
                        },
                        country: {
                            type: 'string',
                            description: 'Country code (2 letters)',
                        },
                        number: {
                            type: 'string',
                            description: 'House number',
                        },
                        state: {
                            type: 'string',
                            description: 'State or province',
                        },
                        street: {
                            type: 'string',
                            description: 'Street name',
                        },
                        suffix: {
                            type: 'string',
                            description: 'Address suffix',
                        },
                        zipcode: {
                            type: 'string',
                            description: 'Postal/ZIP code',
                        },
                    },
                    required: ['city', 'country', 'number', 'street', 'zipcode'],
                },
                api_access_enabled: {
                    type: 'boolean',
                    description: 'Enable API access for this contact',
                    default: false,
                },
                comments: {
                    type: 'string',
                    description: 'Comments about the contact',
                },
                company_name: {
                    type: 'string',
                    description: 'Company name',
                },
                email: {
                    type: 'string',
                    description: 'Contact email address',
                },
                inn: {
                    type: 'string',
                    description: 'INN (Individual Taxpayer Number)',
                },
                is_active: {
                    type: 'boolean',
                    description: 'Whether the contact is active',
                    default: false,
                },
                kpp: {
                    type: 'string',
                    description: 'KPP (Tax Registration Reason Code)',
                },
                locale: {
                    type: 'string',
                    description: 'Contact locale',
                },
                name: {
                    type: 'object',
                    description: 'Contact name information',
                    properties: {
                        first_name: {
                            type: 'string',
                            description: 'First name',
                        },
                        full_name: {
                            type: 'string',
                            description: 'Full name',
                        },
                        initials: {
                            type: 'string',
                            description: 'Initials',
                        },
                        last_name: {
                            type: 'string',
                            description: 'Last name',
                        },
                        prefix: {
                            type: 'string',
                            description: 'Name prefix (Mr, Mrs, etc.)',
                        },
                    },
                    required: ['first_name', 'last_name'],
                },
                password: {
                    type: 'string',
                    description: 'Contact password',
                },
                phone: {
                    type: 'object',
                    description: 'Contact phone information',
                    properties: {
                        area_code: {
                            type: 'string',
                            description: 'Area code',
                        },
                        country_code: {
                            type: 'string',
                            description: 'Country code (e.g., +31)',
                        },
                        subscriber_number: {
                            type: 'string',
                            description: 'Phone number',
                        },
                    },
                    required: ['country_code', 'subscriber_number'],
                },
                role: {
                    type: 'string',
                    description: 'Contact role (admin, tech, billing, owner)',
                    enum: ['admin', 'tech', 'billing', 'owner'],
                },
                type: {
                    type: 'string',
                    description: 'Contact type',
                },
                gender: {
                    type: 'string',
                    description: 'Gender (M/F)',
                    enum: ['M', 'F'],
                },
                username: {
                    type: 'string',
                    description: 'Username for the contact',
                },
                vat: {
                    type: 'string',
                    description: 'VAT number',
                },
            },
            required: ['name', 'phone', 'address'],
        },
    },
    {
        name: 'update_contact',
        description: 'Update an existing contact',
        method: 'PUT',
        path: '/contacts/{id}',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'Contact ID to update',
                },
                additional_data: {
                    type: 'object',
                    description: 'Additional contact data',
                    properties: {
                        birth_city: {
                            type: 'string',
                            description: 'Birth city',
                        },
                        birth_date: {
                            type: 'string',
                            description: 'Birth date (YYYY-MM-DD format)',
                        },
                        social_security_number: {
                            type: 'string',
                            description: 'Social security number',
                        },
                    },
                },
                address: {
                    type: 'object',
                    description: 'Contact address',
                    properties: {
                        city: {
                            type: 'string',
                            description: 'City',
                        },
                        country: {
                            type: 'string',
                            description: 'Country code (2 letters)',
                        },
                        number: {
                            type: 'string',
                            description: 'House number',
                        },
                        state: {
                            type: 'string',
                            description: 'State or province',
                        },
                        street: {
                            type: 'string',
                            description: 'Street name',
                        },
                        suffix: {
                            type: 'string',
                            description: 'Address suffix',
                        },
                        zipcode: {
                            type: 'string',
                            description: 'Postal/ZIP code',
                        },
                    },
                },
                api_access_enabled: {
                    type: 'boolean',
                    description: 'Enable API access for this contact',
                },
                comments: {
                    type: 'string',
                    description: 'Comments about the contact',
                },
                company_name: {
                    type: 'string',
                    description: 'Company name',
                },
                email: {
                    type: 'string',
                    description: 'Contact email address',
                },
                inn: {
                    type: 'string',
                    description: 'INN (Individual Taxpayer Number)',
                },
                is_active: {
                    type: 'boolean',
                    description: 'Whether the contact is active',
                },
                kpp: {
                    type: 'string',
                    description: 'KPP (Tax Registration Reason Code)',
                },
                locale: {
                    type: 'string',
                    description: 'Contact locale',
                },
                name: {
                    type: 'object',
                    description: 'Contact name information',
                    properties: {
                        first_name: {
                            type: 'string',
                            description: 'First name',
                        },
                        full_name: {
                            type: 'string',
                            description: 'Full name',
                        },
                        initials: {
                            type: 'string',
                            description: 'Initials',
                        },
                        last_name: {
                            type: 'string',
                            description: 'Last name',
                        },
                        prefix: {
                            type: 'string',
                            description: 'Name prefix (Mr, Mrs, etc.)',
                        },
                    },
                },
                password: {
                    type: 'string',
                    description: 'Contact password',
                },
                phone: {
                    type: 'object',
                    description: 'Contact phone information',
                    properties: {
                        area_code: {
                            type: 'string',
                            description: 'Area code',
                        },
                        country_code: {
                            type: 'string',
                            description: 'Country code (e.g., +31)',
                        },
                        subscriber_number: {
                            type: 'string',
                            description: 'Phone number',
                        },
                    },
                },
                role: {
                    type: 'string',
                    description: 'Contact role (admin, tech, billing, owner)',
                    enum: ['admin', 'tech', 'billing', 'owner'],
                },
                type: {
                    type: 'string',
                    description: 'Contact type',
                },
                gender: {
                    type: 'string',
                    description: 'Gender (M/F)',
                    enum: ['M', 'F'],
                },
                username: {
                    type: 'string',
                    description: 'Username for the contact',
                },
                vat: {
                    type: 'string',
                    description: 'VAT number',
                },
            },
            required: ['id'],
        },
    },
    {
        name: 'get_contact',
        description: 'Get contact details by ID',
        method: 'GET',
        path: '/contacts/{id}',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'Contact ID',
                },
            },
            required: ['id'],
        },
    },
    {
        name: 'delete_contact',
        description: 'Delete a contact by ID',
        method: 'DELETE',
        path: '/contacts/{id}',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'Contact ID to delete',
                },
            },
            required: ['id'],
        },
    },
    // DNS Management Tools
    {
        name: 'update_domain_nameservers',
        description: 'Update nameservers for a domain',
        method: 'PUT',
        path: '/domains/{id}/nameservers',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'Domain ID',
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
                                description: 'Nameserver IP address (for glue records)',
                            },
                            ip6: {
                                type: 'string',
                                description: 'Nameserver IPv6 address (for glue records)',
                            },
                        },
                        required: ['name'],
                    },
                },
            },
            required: ['id', 'name_servers'],
        },
    },
    {
        name: 'create_dns_zone',
        description: 'Create a DNS zone for a domain',
        method: 'POST',
        path: '/dns/zones',
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
                type: {
                    type: 'string',
                    description: 'Zone type (master or slave)',
                    enum: ['master', 'slave'],
                    default: 'master',
                },
                master_ip: {
                    type: 'string',
                    description: 'Master IP for slave zones',
                },
            },
            required: ['domain'],
        },
    },
    {
        name: 'list_dns_zones',
        description: 'List all DNS zones',
        method: 'GET',
        path: '/dns/zones',
        inputSchema: {
            type: 'object',
            properties: {
                limit: {
                    type: 'number',
                    description: 'Maximum number of zones to return',
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
        name: 'get_dns_zone',
        description: 'Get DNS zone details',
        method: 'GET',
        path: '/dns/zones/{name}',
        inputSchema: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Zone name (domain.extension)',
                },
            },
            required: ['name'],
        },
    },
    {
        name: 'delete_dns_zone',
        description: 'Delete a DNS zone',
        method: 'DELETE',
        path: '/dns/zones/{name}',
        inputSchema: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Zone name (domain.extension)',
                },
            },
            required: ['name'],
        },
    },
    {
        name: 'list_dns_records',
        description: 'List DNS records for a zone',
        method: 'GET',
        path: '/dns/zones/{name}/records',
        inputSchema: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Zone name (domain.extension)',
                },
                type: {
                    type: 'string',
                    description: 'Filter by record type (A, AAAA, CNAME, MX, TXT, etc.)',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of records to return',
                    default: 100,
                },
                offset: {
                    type: 'number',
                    description: 'Offset for pagination',
                    default: 0,
                },
            },
            required: ['name'],
        },
    },
    {
        name: 'create_dns_record',
        description: 'Create a DNS record',
        method: 'POST',
        path: '/dns/zones/{zone}/records',
        inputSchema: {
            type: 'object',
            properties: {
                zone: {
                    type: 'string',
                    description: 'Zone name (domain.extension)',
                },
                name: {
                    type: 'string',
                    description: 'Record name (subdomain or @ for root)',
                },
                type: {
                    type: 'string',
                    description: 'Record type',
                    enum: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SPF', 'NS', 'SOA', 'PTR', 'SRV', 'CAA'],
                },
                value: {
                    type: 'string',
                    description: 'Record value (IP address, hostname, text, etc.)',
                },
                ttl: {
                    type: 'number',
                    description: 'Time to live in seconds',
                    default: 3600,
                },
                prio: {
                    type: 'number',
                    description: 'Priority (for MX and SRV records)',
                },
            },
            required: ['zone', 'name', 'type', 'value'],
        },
    },
    {
        name: 'update_dns_record',
        description: 'Update a DNS record',
        method: 'PUT',
        path: '/dns/zones/{zone}/records/{id}',
        inputSchema: {
            type: 'object',
            properties: {
                zone: {
                    type: 'string',
                    description: 'Zone name (domain.extension)',
                },
                id: {
                    type: 'number',
                    description: 'Record ID',
                },
                name: {
                    type: 'string',
                    description: 'Record name (subdomain or @ for root)',
                },
                type: {
                    type: 'string',
                    description: 'Record type',
                    enum: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SPF', 'NS', 'SOA', 'PTR', 'SRV', 'CAA'],
                },
                value: {
                    type: 'string',
                    description: 'Record value (IP address, hostname, text, etc.)',
                },
                ttl: {
                    type: 'number',
                    description: 'Time to live in seconds',
                },
                prio: {
                    type: 'number',
                    description: 'Priority (for MX and SRV records)',
                },
            },
            required: ['zone', 'id'],
        },
    },
    {
        name: 'delete_dns_record',
        description: 'Delete a DNS record',
        method: 'DELETE',
        path: '/dns/zones/{zone}/records/{id}',
        inputSchema: {
            type: 'object',
            properties: {
                zone: {
                    type: 'string',
                    description: 'Zone name (domain.extension)',
                },
                id: {
                    type: 'number',
                    description: 'Record ID',
                },
            },
            required: ['zone', 'id'],
        },
    },
    // Domain Transfer Management
    {
        name: 'transfer_domain',
        description: 'Transfer a domain to Openprovider',
        method: 'POST',
        path: '/domains/transfer',
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
                auth_code: {
                    type: 'string',
                    description: 'Transfer authorization code (EPP code)',
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
                        },
                        required: ['name'],
                    },
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
            },
            required: ['domain', 'auth_code', 'owner_handle'],
        },
    },
    {
        name: 'check_transfer_status',
        description: 'Check the status of a domain transfer',
        method: 'GET',
        path: '/domains/transfer/{id}',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'Transfer ID',
                },
            },
            required: ['id'],
        },
    },
    // Domain Renewal
    {
        name: 'renew_domain',
        description: 'Renew a domain registration',
        method: 'POST',
        path: '/domains/{id}/renew',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'Domain ID',
                },
                period: {
                    type: 'number',
                    description: 'Renewal period in years',
                    default: 1,
                },
            },
            required: ['id'],
        },
    },
    // WHOIS Privacy Management
    {
        name: 'enable_whois_privacy',
        description: 'Enable WHOIS privacy protection for a domain',
        method: 'PUT',
        path: '/domains/{id}/privacy',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'Domain ID',
                },
                enabled: {
                    type: 'boolean',
                    description: 'Enable or disable WHOIS privacy',
                    default: true,
                },
            },
            required: ['id'],
        },
    },
    {
        name: 'get_whois_info',
        description: 'Get WHOIS information for a domain',
        method: 'GET',
        path: '/domains/{id}/whois',
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
    // SSL Certificate Management
    {
        name: 'list_ssl_products',
        description: 'List available SSL certificate products',
        method: 'GET',
        path: '/ssl/products',
        inputSchema: {
            type: 'object',
            properties: {
                limit: {
                    type: 'number',
                    description: 'Maximum number of products to return',
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
        name: 'order_ssl_certificate',
        description: 'Order an SSL certificate',
        method: 'POST',
        path: '/ssl/orders',
        inputSchema: {
            type: 'object',
            properties: {
                product_id: {
                    type: 'number',
                    description: 'SSL product ID',
                },
                period: {
                    type: 'number',
                    description: 'Certificate validity period in years',
                    default: 1,
                },
                csr: {
                    type: 'string',
                    description: 'Certificate Signing Request (CSR)',
                },
                domain_validation_methods: {
                    type: 'array',
                    description: 'Domain validation methods',
                    items: {
                        type: 'object',
                        properties: {
                            domain: {
                                type: 'string',
                                description: 'Domain to validate',
                            },
                            method: {
                                type: 'string',
                                description: 'Validation method',
                                enum: ['dns', 'email', 'file'],
                            },
                        },
                        required: ['domain', 'method'],
                    },
                },
                approver_email: {
                    type: 'string',
                    description: 'Email address for domain validation',
                },
                organization_handle: {
                    type: 'string',
                    description: 'Organization contact handle',
                },
                technical_handle: {
                    type: 'string',
                    description: 'Technical contact handle',
                },
            },
            required: ['product_id', 'csr'],
        },
    },
    {
        name: 'list_ssl_orders',
        description: 'List SSL certificate orders',
        method: 'GET',
        path: '/ssl/orders',
        inputSchema: {
            type: 'object',
            properties: {
                limit: {
                    type: 'number',
                    description: 'Maximum number of orders to return',
                    default: 100,
                },
                offset: {
                    type: 'number',
                    description: 'Offset for pagination',
                    default: 0,
                },
                status: {
                    type: 'string',
                    description: 'Filter by order status',
                    enum: ['pending', 'active', 'cancelled', 'expired'],
                },
            },
            required: [],
        },
    },
    {
        name: 'get_ssl_order',
        description: 'Get SSL certificate order details',
        method: 'GET',
        path: '/ssl/orders/{id}',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'SSL order ID',
                },
            },
            required: ['id'],
        },
    },
    {
        name: 'reissue_ssl_certificate',
        description: 'Reissue an SSL certificate',
        method: 'POST',
        path: '/ssl/orders/{id}/reissue',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'SSL order ID',
                },
                csr: {
                    type: 'string',
                    description: 'New Certificate Signing Request (CSR)',
                },
                domain_validation_methods: {
                    type: 'array',
                    description: 'Domain validation methods',
                    items: {
                        type: 'object',
                        properties: {
                            domain: {
                                type: 'string',
                                description: 'Domain to validate',
                            },
                            method: {
                                type: 'string',
                                description: 'Validation method',
                                enum: ['dns', 'email', 'file'],
                            },
                        },
                        required: ['domain', 'method'],
                    },
                },
            },
            required: ['id', 'csr'],
        },
    },
    {
        name: 'renew_ssl_certificate',
        description: 'Renew an SSL certificate',
        method: 'POST',
        path: '/ssl/orders/{id}/renew',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'SSL order ID',
                },
                period: {
                    type: 'number',
                    description: 'Renewal period in years',
                    default: 1,
                },
            },
            required: ['id'],
        },
    },
    {
        name: 'cancel_ssl_order',
        description: 'Cancel an SSL certificate order',
        method: 'DELETE',
        path: '/ssl/orders/{id}',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'SSL order ID',
                },
            },
            required: ['id'],
        },
    },
    // DNSSEC Management
    {
        name: 'enable_dnssec',
        description: 'Enable DNSSEC for a domain',
        method: 'PUT',
        path: '/domains/{id}/dnssec',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'Domain ID',
                },
                keys: {
                    type: 'array',
                    description: 'DNSSEC keys',
                    items: {
                        type: 'object',
                        properties: {
                            flags: {
                                type: 'number',
                                description: 'Key flags',
                            },
                            alg: {
                                type: 'number',
                                description: 'Algorithm',
                            },
                            protocol: {
                                type: 'number',
                                description: 'Protocol',
                            },
                            pub_key: {
                                type: 'string',
                                description: 'Public key',
                            },
                        },
                        required: ['flags', 'alg', 'protocol', 'pub_key'],
                    },
                },
            },
            required: ['id'],
        },
    },
    {
        name: 'disable_dnssec',
        description: 'Disable DNSSEC for a domain',
        method: 'DELETE',
        path: '/domains/{id}/dnssec',
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
        name: 'get_dnssec_info',
        description: 'Get DNSSEC information for a domain',
        method: 'GET',
        path: '/domains/{id}/dnssec',
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
    // Domain Search and Suggestions
    {
        name: 'search_domains',
        description: 'Search for available domains with suggestions',
        method: 'POST',
        path: '/domains/search',
        inputSchema: {
            type: 'object',
            properties: {
                keyword: {
                    type: 'string',
                    description: 'Search keyword for domain suggestions',
                },
                extensions: {
                    type: 'array',
                    description: 'List of TLD extensions to check',
                    items: {
                        type: 'string',
                    },
                    default: ['com', 'net', 'org', 'io', 'co'],
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of suggestions',
                    default: 20,
                },
                include_premium: {
                    type: 'boolean',
                    description: 'Include premium domains in results',
                    default: false,
                },
            },
            required: ['keyword'],
        },
    },
    // Domain Lock Management
    {
        name: 'lock_domain',
        description: 'Lock a domain to prevent unauthorized transfers',
        method: 'PUT',
        path: '/domains/{id}/lock',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'Domain ID',
                },
                lock_type: {
                    type: 'string',
                    description: 'Type of lock',
                    enum: ['registrar', 'registry'],
                    default: 'registrar',
                },
            },
            required: ['id'],
        },
    },
    {
        name: 'unlock_domain',
        description: 'Unlock a domain',
        method: 'DELETE',
        path: '/domains/{id}/lock',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'Domain ID',
                },
                lock_type: {
                    type: 'string',
                    description: 'Type of lock',
                    enum: ['registrar', 'registry'],
                    default: 'registrar',
                },
            },
            required: ['id'],
        },
    },
    // Email Forwarding
    {
        name: 'create_email_forward',
        description: 'Create email forwarding for a domain',
        method: 'POST',
        path: '/domains/{id}/email-forwards',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'Domain ID',
                },
                source: {
                    type: 'string',
                    description: 'Source email address (e.g., info@domain.com)',
                },
                destination: {
                    type: 'string',
                    description: 'Destination email address',
                },
            },
            required: ['id', 'source', 'destination'],
        },
    },
    {
        name: 'list_email_forwards',
        description: 'List email forwards for a domain',
        method: 'GET',
        path: '/domains/{id}/email-forwards',
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
        name: 'delete_email_forward',
        description: 'Delete an email forward',
        method: 'DELETE',
        path: '/domains/{id}/email-forwards/{forward_id}',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'Domain ID',
                },
                forward_id: {
                    type: 'number',
                    description: 'Email forward ID',
                },
            },
            required: ['id', 'forward_id'],
        },
    },
];
/**
 * MCP Server for Openprovider API
 */
class MCPServer {
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
        this.server = new Server({
            name: "openprovider-mcp",
            version: "0.1.0",
        }, {
            capabilities: {
                tools: {}, // Enable tools capability
            },
        });
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
                // Special handling for create_contact and update_contact to ensure all required fields are present
                let processedParams = params || {};
                if (toolName === 'create_contact') {
                    processedParams = this.processContactData(params || {});
                }
                else if (toolName === 'update_contact') {
                    processedParams = this.processUpdateContactData(params || {});
                }
                // Execute the API call
                const result = await this.executeApiCall(toolDetails, processedParams);
                // Return the result in the correct MCP format
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result)
                        }
                    ]
                };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.log('error', `Error executing tool ${name}: ${errorMessage}`);
                throw error;
            }
        });
    }
    /**
     * Process contact data to ensure all required fields are present
     */
    processContactData(params) {
        // Generate a unique username if not provided
        const username = params.username || `contact_${Date.now()}`;
        // Ensure all required fields have at least empty values
        const processedData = {
            // Required fields with defaults
            username: username,
            name: {
                first_name: params.name?.first_name || '',
                last_name: params.name?.last_name || '',
                full_name: params.name?.full_name || `${params.name?.first_name || ''} ${params.name?.last_name || ''}`.trim(),
                initials: params.name?.initials || '',
                prefix: params.name?.prefix || ''
            },
            email: params.email || '',
            phone: {
                country_code: params.phone?.country_code || '',
                area_code: params.phone?.area_code || '',
                subscriber_number: params.phone?.subscriber_number || ''
            },
            address: {
                street: params.address?.street || '',
                number: params.address?.number || '',
                suffix: params.address?.suffix || '',
                city: params.address?.city || '',
                state: params.address?.state || '',
                zipcode: params.address?.zipcode || '',
                country: params.address?.country || ''
            },
            // Optional fields with defaults
            additional_data: params.additional_data || {},
            api_access_enabled: params.api_access_enabled || false,
            comments: params.comments || '',
            company_name: params.company_name || '',
            inn: params.inn || '',
            is_active: params.is_active !== undefined ? params.is_active : true,
            kpp: params.kpp || '',
            locale: params.locale || '',
            password: params.password || '',
            role: params.role || 'tech',
            vat: params.vat || '',
            // Include type and gender if provided
            ...(params.type && { type: params.type }),
            ...(params.gender && { gender: params.gender })
        };
        // Handle phone number formatting for India and other countries
        if (params.phone?.country_code && params.phone?.subscriber_number) {
            const fullNumber = params.phone.subscriber_number.replace(/\D/g, '');
            // For Indian numbers, split area code from subscriber number
            if (params.phone.country_code === '+91' && fullNumber.length >= 10) {
                processedData.phone.area_code = fullNumber.substring(0, 3);
                processedData.phone.subscriber_number = fullNumber.substring(3);
            }
        }
        return processedData;
    }
    /**
     * Process update contact data to ensure proper formatting
     */
    processUpdateContactData(params) {
        // ID is required for update
        if (!params.id) {
            throw new Error('Contact ID is required for update');
        }
        const processedData = {
            id: params.id
        };
        // Only include fields that are provided in the update request
        if (params.name) {
            processedData.name = {
                first_name: params.name.first_name || '',
                last_name: params.name.last_name || '',
                full_name: params.name.full_name || `${params.name.first_name || ''} ${params.name.last_name || ''}`.trim(),
                initials: params.name.initials || '',
                prefix: params.name.prefix || ''
            };
        }
        if (params.email !== undefined) {
            processedData.email = params.email;
        }
        if (params.phone) {
            processedData.phone = {
                country_code: params.phone.country_code || '',
                area_code: params.phone.area_code || '',
                subscriber_number: params.phone.subscriber_number || ''
            };
            // Handle phone number formatting for India and other countries
            if (params.phone.country_code && params.phone.subscriber_number) {
                const fullNumber = params.phone.subscriber_number.replace(/\D/g, '');
                // For Indian numbers, split area code from subscriber number
                if (params.phone.country_code === '+91' && fullNumber.length >= 10) {
                    processedData.phone.area_code = fullNumber.substring(0, 3);
                    processedData.phone.subscriber_number = fullNumber.substring(3);
                }
            }
        }
        if (params.address) {
            processedData.address = {
                street: params.address.street || '',
                number: params.address.number || '',
                suffix: params.address.suffix || '',
                city: params.address.city || '',
                state: params.address.state || '',
                zipcode: params.address.zipcode || '',
                country: params.address.country || ''
            };
        }
        // Include other fields if provided
        const optionalFields = [
            'additional_data', 'api_access_enabled', 'comments', 'company_name',
            'inn', 'is_active', 'kpp', 'locale', 'password', 'role', 'vat',
            'type', 'gender', 'username'
        ];
        optionalFields.forEach(field => {
            if (params[field] !== undefined) {
                processedData[field] = params[field];
            }
        });
        return processedData;
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
        }
        catch (error) {
            let errorMessage = 'Authentication error';
            if (axios.isAxiosError(error) && error.response) {
                errorMessage = `Authentication error: ${error.response.data?.desc || error.message}`;
            }
            else if (error instanceof Error) {
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
            const config = {
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
            }
            else {
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
        }
        catch (error) {
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
        }
        catch (error) {
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
    }
    catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}
main();
