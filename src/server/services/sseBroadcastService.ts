import { Response } from 'express';

class SseBroadcastService {
  private clients: Set<Response> = new Set();

  addClient(res: Response): void {
    this.clients.add(res);

    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  broadcast(eventType: string, data: unknown): void {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch (err) {
        console.error('Error sending SSE to client:', err);
        this.clients.delete(client);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const sseBroadcast = new SseBroadcastService();
