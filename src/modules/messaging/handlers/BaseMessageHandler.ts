/**
 * Abstract base class for message handlers
 */
export abstract class BaseMessageHandler {
  /**
   * Handle the tool execution
   */
  abstract handle(args: any, userId: string, messageTimestamp: Date, user?: any): Promise<{
    text: string;
    type: string;
  }>;

  /**
   * Get the tool name this handler is responsible for
   */
  abstract getToolName(): string;

  /**
   * Validate if this handler can process the given tool name
   */
  canHandle(toolName: string): boolean {
    return toolName === this.getToolName();
  }
} 