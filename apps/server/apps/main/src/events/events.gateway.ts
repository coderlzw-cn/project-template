import { Logger } from '@nestjs/common';
import { MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { type Server, WebSocket } from 'ws';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsService } from './events.service';

@WebSocketGateway({ path: '/demo', cors: true })
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);
  constructor(private readonly eventsService: EventsService) {}

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    server.on('connection', (client: WebSocket, request: Request) => {
      const origin = request.headers['origin'] as string;
      this.logger.debug(`Connection from ${origin}, state: ${client.readyState}`);
      client.on('close', () => {
        this.logger.debug(`Client disconnected: ${origin}, state: ${client.readyState}`);
      });
    });
  }

  handleConnection(client: WebSocket) {
    client.send(
      JSON.stringify({
        event: 'connect',
        data: { message: 'Hello from server' },
      }),
    );
  }

  handleDisconnect(_client: WebSocket) {
    // this.logger.debug(`Client disconnected: ${client.readyState} ${client.url}`);
  }

  // {event: 'createEvent', data: { description: 'test', count: 1 }}
  @SubscribeMessage('createEvent')
  create(@MessageBody() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  // {event: 'findOneEvent', data: 1 }
  @SubscribeMessage('findOneEvent')
  findOne(@MessageBody() id: number) {
    return this.eventsService.findOne(id);
  }

  @SubscribeMessage('updateEvent')
  update(@MessageBody() updateEventDto: UpdateEventDto) {
    return this.eventsService.update(updateEventDto.id, updateEventDto);
  }
}
