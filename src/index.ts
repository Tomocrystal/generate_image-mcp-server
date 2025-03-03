#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const API_KEY = process.env.OPENAI_API_KEY;
const MODEL_ID = process.env.OPENAI_MODEL_ID || "dall-e-3";
const DEFAULT_WORKING_DIR = process.env.CLINE_WORKING_DIR || process.cwd();

// 检查必要的环境变量
if (!API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

if (!MODEL_ID) {
  throw new Error('OPENAI_MODEL_ID environment variable is required');
}

// 跨平台文件权限设置
const setExecutablePermissions = (filePath: string) => {
  if (os.platform() !== 'win32') {
    try {
      fs.chmodSync(filePath, '755');
    } catch (error) {
      console.warn(`Warning: Could not set executable permissions on ${filePath}`);
    }
  }
};

// 确保路径分隔符正确
const normalizePath = (inputPath: string) => {
  return path.normalize(inputPath).replace(/[\/]+/g, path.sep);
};

interface GenerateImageArgs {
  prompt: string;
  size?: string;
  width?: number;
  height?: number;
  n?: number;
  output_filename?: string;
  output_dir?: string;
}

const isValidGenerateImageArgs = (args: any): args is GenerateImageArgs => {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.prompt === 'string' &&
    (args.size === undefined || typeof args.size === 'string') &&
(args.width === undefined || typeof args.width === 'number') &&
    (args.height === undefined || typeof args.height === 'number') &&
    (args.n === undefined || typeof args.n === 'number') &&
    (args.output_filename === undefined || typeof args.output_filename === 'string') &&
    (args.output_dir === undefined || typeof args.output_dir === 'string')
  );
};

class FluxDevServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'genimg-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    
    // 跨平台信号处理
    if (os.platform() === 'win32') {
      if (process.stdin.isTTY) {
        require('readline')
          .createInterface({
            input: process.stdin,
            output: process.stdout
          })
          .on('SIGINT', () => {
            process.emit('SIGINT', 'SIGINT');
          });
      }
    }
    
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'generate_image_openai',
          description: 'Generate an image using OpenAI DALL-E model',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: {
                type: 'string',
                description: 'Text prompt describing the desired image',
              },
              size: {
                type: 'string',
                description: 'Image size (e.g., "1024x1024", "512x512", "256x256")',
              },
  width: {
                type: 'number',
                description: 'Image width in pixels (e.g., 1024)',
              },
              height: {
                type: 'number',
                description: 'Image height in pixels (e.g., 1024)',
              },
              n: {
                type: 'number',
                description: 'Number of images to generate (default: 1)',
              },
              output_filename: {
                type: 'string',
                description: 'Output filename for the generated image (default: generated_{timestamp}.png)',
              },
              output_dir: {
                type: 'string',
                description: 'Output directory path (default: current working directory)',
              },
            },
            required: ['prompt'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'generate_image_openai') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      if (!isValidGenerateImageArgs(request.params.arguments)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Invalid generate_image arguments'
        );
      }

      try {
        const {
          prompt,
          size: initialSize = "1024x1024",
          width,
          height,
          n = 1,
          output_filename = `generated_${Date.now()}.png`,
          output_dir = DEFAULT_WORKING_DIR,
        } = request.params.arguments;
// 根据 width 和 height 计算 size
        let size = initialSize;
        if (width && height) {
          // DALL-E 3 支持的尺寸限制
          const validSizes = ['1024x1024', '1024x1792', '1792x1024'];
          const requestedSize = `${width}x${height}`;
          
          if (!validSizes.includes(requestedSize)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Invalid image dimensions. Supported sizes are: 1024x1024, 1024x1792, 1792x1024'
            );
          }
          size = requestedSize;
        }

        const response = await axios({
          method: 'post',
          url: 'https://xiaohumini.site/v1/images/generations',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          },
          data: {
            'model': MODEL_ID,
            'prompt': prompt,
            'size': size,
            'n': n,
          },
        });

        // 跨平台创建目录
        const normalizedOutputDir = normalizePath(output_dir);
        if (!fs.existsSync(normalizedOutputDir)) {
          fs.mkdirSync(normalizedOutputDir, { recursive: true });
        }

        // 使用规范化的路径保存文件
        const outputPath = normalizePath(path.join(normalizedOutputDir, output_filename));
        
        // Download the image from the URL
        const imageResponse = await axios({
          method: 'get',
          url: response.data.data[0].url,
          responseType: 'arraybuffer',
        });
        
        // Write the image data to the file
        fs.writeFileSync(outputPath, Buffer.from(imageResponse.data));
        // 设置可执行权限（仅在非Windows系统）
        setExecutablePermissions(outputPath);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'success',
                output_file: outputPath,
                parameters: {
                  prompt,
                  size,
                  n,
                  output_dir: normalizedOutputDir,
                },
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          return {
            content: [
              {
                type: 'text',
                text: `API error: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
        throw error;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Flux Dev MCP server running on stdio');
  }
}

const server = new FluxDevServer();
server.run().catch(console.error);