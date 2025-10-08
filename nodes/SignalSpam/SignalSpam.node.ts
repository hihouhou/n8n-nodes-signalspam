import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	IHttpRequestMethods,
} from 'n8n-workflow';

export class SignalSpam implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SignalSpam',
		name: 'SignalSpam',
		icon: 'file:signalspam.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Node for reporting spam to Signal Spam platform',
		defaults: {
			name: 'SignalSpam',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'SignalSpamApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Report Spam',
						value: 'reportSpam',
						description: 'Report a spam message to Signal Spam',
						action: 'Report spam message',
					},
				],
				default: 'reportSpam',
			},
			{
				displayName: 'Raw Email',
				name: 'rawEmail',
				type: 'string',
				typeOptions: {
					rows: 10,
				},
				default: '',
				placeholder: '{{ $json.raw }}',
				description: 'The raw email content',
				required: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const credentials = await this.getCredentials('SignalSpamApi');
				const rawEmail = this.getNodeParameter('rawEmail', i) as string;

				// Encoder en Base64
				const base64Email = Buffer.from(rawEmail).toString('base64');

				// Authentification Basic
				const authString = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');

				// Boundary pour multipart
				const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
				const body = [
					`--${boundary}`,
					'Content-Disposition: form-data; name="message"',
					'',
					base64Email,
					`--${boundary}--`
				].join('\r\n');

				// Faire la requête HTTP
				const options = {
					method: 'POST' as IHttpRequestMethods,
					url: 'https://www.signal-spam.fr/api/signaler',
					headers: {
						'Authorization': `Basic ${authString}`,
						'Content-Type': `multipart/form-data; boundary=${boundary}`,
						'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:45.0) Gecko/20100101 Thunderbird/52.4.0',
					},
					body: body,
				};

				const response = await this.helpers.httpRequest(options);

				returnData.push({
					json: {
						success: true,
						message: 'Spam reported successfully',
						response: response,
					},
					pairedItem: { item: i },
				});

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							success: false,
							error: error.message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
