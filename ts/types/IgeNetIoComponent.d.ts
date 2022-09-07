declare class IgeNetIoComponent extends IgeEventingClass implements IgeNetIoClient {

	stream: IgeStreamComponent;

	send(commandName: string, data: any): void;
}
