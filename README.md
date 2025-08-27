# Requestary

Requestary is a VS Code extension for API testing and request management.

## Importing Collections

### Supported Formats

Requestary supports importing collections from:
- Thunder Client
- Native Requestary format 
- *POSTMAN is coming soon

### Sample Collection

A sample collection is provided in `sample-collection.json`. This file demonstrates the expected JSON structure for importing collections.

#### Collection JSON Structure

```json
{
    "name": "Collection Name",
    "requests": [
        {
            "id": "unique_request_id",
            "name": "Request Name",
            "method": "GET|POST|PUT|DELETE|...",
            "url": "https://api.example.com/endpoint",
            "headers": {
                "Header-Name": "Header Value"
            },
            "body": "Optional request body",
            "auth": {
                "type": "bearer|none",
                "token": "Optional bearer token"
            }
        }
    ]
}
```

### Importing Collections

#### Download Sample Collection

You can download the sample collection in two ways:

1. **From the Side Panel**:
   - Open the Requestary view in the sidebar
   - Click the "+" (download) icon in the panel header
   - Choose a location to save the file

2. **From Command Palette**:
   - Open the Command Palette (Ctrl+Shift+P or Cmd+Shift+P)
   - Type "Requestary: Download Sample Collection"
   - Choose a location to save the file

Use the downloaded file as a template or import reference for your API collections.

#### Importing a Collection

1. Click on the "Import Collection" button in the Requestary sidebar
2. Select your collection JSON file
3. The collection will be imported and added to your Requestary workspace

## Features

- Import API collections
- Send HTTP requests
- Manage request history
- Support for various authentication methods

## Installation

Install from the VS Code Extensions marketplace.

## Usage

1. Open the Command Palette (Ctrl+Shift+P)
2. Type "Requestary: Send REST Request"
3. Select the HTTP method
4. Enter the URL
5. For methods like POST/PUT, enter the request body

## Contributing

Contributions are always welcome! 🎉  

- 🐛 [Report Issues](https://github.com/requestary/vscode-requestary/issues)  
- 🔀 [Submit Pull Requests](https://github.com/requestary/vscode-requestary/pulls)

