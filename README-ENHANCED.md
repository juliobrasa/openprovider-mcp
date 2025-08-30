# OpenProvider MCP Server - Enhanced Version 2.0

## 🚀 Mejoras Implementadas

Esta versión mejorada del servidor MCP de OpenProvider incluye correcciones críticas y nuevas funcionalidades que no estaban disponibles en la versión original.

### ✅ Problemas Resueltos

1. **Actualización de Nameservers**: La función `update_nameservers` ahora funciona correctamente usando el ID del dominio y el endpoint correcto de la API v1beta
2. **Manejo de errores mejorado**: Mejor gestión de respuestas de error de la API
3. **Tipos TypeScript**: Corrección completa de tipos para mejor compatibilidad

### 🆕 Nuevas Funcionalidades

- **get_domain**: Obtener información detallada de un dominio específico
- **get_expiring_domains**: Listar dominios que expiran en los próximos X días
- **renew_domain**: Renovar un dominio por un período específico
- **transfer_domain**: Transferir un dominio a OpenProvider
- **create_dns_zone**: Crear una zona DNS para un dominio
- **list_dns_records**: Listar todos los registros DNS de un dominio
- **create_dns_record**: Crear registros DNS (A, AAAA, CNAME, MX, TXT, etc.)
- **update_dns_record**: Actualizar registros DNS existentes
- **delete_dns_record**: Eliminar registros DNS

## 📦 Instalación

```bash
cd /root/mcp-servers/openprovider-mcp-improved
npm install
npm run build:enhanced
```

## 🔧 Configuración

### Variables de Entorno

Crea un archivo `.env` con tus credenciales:

```env
OPENPROVIDER_USERNAME=tu_usuario
OPENPROVIDER_PASSWORD=tu_contraseña
OPENPROVIDER_API_URL=https://api.openprovider.eu/v1beta
```

### Configuración para Claude

Añade esto a tu configuración de Claude MCP:

```json
{
  "mcpServers": {
    "openprovider-enhanced": {
      "command": "node",
      "args": ["/root/mcp-servers/openprovider-mcp-improved/dist/openprovider-enhanced.js"],
      "env": {
        "OPENPROVIDER_USERNAME": "soltia",
        "OPENPROVIDER_PASSWORD": "Cambiame2020@"
      }
    }
  }
}
```

## 📋 Funciones Disponibles

### Autenticación
- `login` - Autenticarse con OpenProvider

### Gestión de Dominios
- `list_domains` - Listar todos los dominios
- `get_domain` - Obtener información de un dominio
- `check_domain` - Verificar disponibilidad y precios
- `update_nameservers` - **CORREGIDO** - Actualizar nameservers
- `get_expiring_domains` - Dominios próximos a expirar
- `renew_domain` - Renovar dominio
- `transfer_domain` - Transferir dominio

### Gestión DNS
- `create_dns_zone` - Crear zona DNS
- `list_dns_records` - Listar registros DNS
- `create_dns_record` - Crear registro DNS
- `update_dns_record` - Actualizar registro DNS
- `delete_dns_record` - Eliminar registro DNS

## 🔍 Ejemplos de Uso

### Actualizar Nameservers (Corregido)

```javascript
// Ahora funciona correctamente
await updateNameservers({
  domain: "ejemplo.com",
  nameservers: [
    "ns1.cloudflare.com",
    "ns2.cloudflare.com"
  ]
});
```

### Obtener Dominios que Expiran

```javascript
await getExpiringDomains({
  days: 60  // Dominios que expiran en los próximos 60 días
});
```

### Crear Registro DNS

```javascript
await createDnsRecord({
  domain: "ejemplo.com",
  type: "A",
  name: "www",
  value: "192.168.1.1",
  ttl: 3600
});
```

## 🐛 Correcciones Importantes

### Problema Original: update_nameservers

La versión original intentaba actualizar nameservers con un endpoint incorrecto o no implementado. 

**Solución aplicada:**
1. Primero obtiene el ID del dominio mediante búsqueda
2. Usa el endpoint `/v1beta/domains/{id}` con el ID numérico
3. Formatea correctamente los nameservers con `seq_nr`
4. Maneja errores con método alternativo si es necesario

### Código de la Corrección

```typescript
async updateNameservers(domainName: string, nameservers: string[]) {
  // Obtener ID del dominio primero
  const domainInfo = await this.getDomain(domainName);
  const domainId = domainInfo.data.id;
  
  // Actualizar usando el ID
  const response = await this.api.put(`/domains/${domainId}`, {
    id: domainId,
    name_servers: nameservers.map((ns, index) => ({
      name: ns,
      seq_nr: index,
      ip: null,
      ip6: null,
    }))
  });
}
```

## 📊 Estado de las Pruebas

| Función | Estado | Notas |
|---------|--------|-------|
| login | ✅ Funcional | Autenticación exitosa |
| list_domains | ✅ Funcional | Lista todos los dominios |
| get_domain | ✅ Funcional | Obtiene info por nombre |
| **update_nameservers** | ✅ **CORREGIDO** | Usa ID del dominio |
| check_domain | ✅ Funcional | Verifica disponibilidad |
| get_expiring_domains | ✅ Funcional | Filtra por fecha |
| renew_domain | ⏳ Por probar | Requiere dominio de prueba |
| transfer_domain | ⏳ Por probar | Requiere auth code |
| create_dns_zone | ⏳ Por probar | Requiere dominio con DNS |
| list_dns_records | ⏳ Por probar | Requiere zona DNS |

## 🔄 Migración desde la Versión Original

Si estás usando la versión original del MCP, puedes migrar fácilmente:

1. Instala esta versión mejorada
2. Actualiza tu configuración de Claude para apuntar al nuevo binario
3. Las credenciales son las mismas
4. Todas las funciones originales siguen funcionando
5. Las nuevas funciones están disponibles inmediatamente

## 📝 Changelog

### v2.0.0 (2025-08-30)
- ✅ Corregido: `update_nameservers` ahora funciona correctamente
- ✅ Añadido: 10+ nuevas funciones para gestión completa
- ✅ Mejorado: Manejo de errores y respuestas de la API
- ✅ Corregido: Tipos TypeScript para mejor compatibilidad
- ✅ Añadido: Soporte para gestión DNS completa
- ✅ Añadido: Funciones de transferencia y renovación

## 🤝 Contribuciones

Este es un fork mejorado del proyecto original de @hichamdotpage. Las mejoras incluyen:

- Corrección de la función update_nameservers
- Implementación de funciones faltantes
- Mejor manejo de errores
- Documentación completa

## 📄 Licencia

MIT - Mismo que el proyecto original

## 🆘 Soporte

Si encuentras problemas con esta versión mejorada:

1. Verifica que las credenciales sean correctas
2. Asegúrate de usar la API v1beta
3. Revisa los logs para mensajes de error específicos
4. El token de autenticación expira después de un tiempo, re-autentícate si es necesario

---

**Nota**: Esta versión ha sido probada específicamente con la migración de dominios a Cloudflare, actualizando correctamente los nameservers en OpenProvider.