import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
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
				displayName: 'Email Content',
				name: 'emailContent',
				type: 'string',
				typeOptions: {
					rows: 10,
				},
				default: '',
				placeholder: 'Full email content including headers',
				description: 'The complete email content to report as spam',
				required: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const nodeInstance = this.getNode();

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				let responseData: any = {};

				switch (operation) {
					case 'reportSpam':
						responseData = await SignalSpam.prototype.reportSpamToSignalSpam(this, i);
						break;
					default:
						throw new NodeOperationError(nodeInstance, `The operation "${operation}" is not supported`);
				}

				returnData.push({
					json: responseData,
					pairedItem: { item: i },
				});

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
							success: false
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

	private async reportSpamToSignalSpam(executeFunctions: IExecuteFunctions, itemIndex: number): Promise<any> {
		const credentials = await executeFunctions.getCredentials('signalSpamApi');

		const emailContent = executeFunctions.getNodeParameter('emailContent', itemIndex) as string;

		// Prepare the spam report data
		const reportData = this.prepareReportData(
			emailContent
		);

		try {
			// Submit to Signal Spam API using n8n's HTTP request helper
			const result = await this.submitToSignalSpam(executeFunctions, credentials, reportData);

			return {
				success: true,
				message: 'Spam reported successfully to Signal Spam',
				reportId: result.id || 'unknown',
				submittedAt: new Date().toISOString(),
				response: result
			};

		} catch (error) {
			throw new NodeOperationError(executeFunctions.getNode(), `Failed to report spam: ${error.message}`);
		}
	}

	private prepareReportData(
		emailContent: string
	): any {
		const reportData: any = {
			// Signal Spam API fields
			'email_content': emailContent
		};

		return reportData;
	}

	private async submitToSignalSpam(executeFunctions: IExecuteFunctions, credentials: any, reportData: any): Promise<any> {
		// Prepare form data
		const formData: any = {
			'login': credentials.username,
			'password': credentials.password,
			...reportData
		};

		// Convert to URL-encoded string
		const postData = Object.keys(formData)
			.map(key => `${encodeURIComponent(key)}=${encodeURIComponent(formData[key])}`)
			.join('&');

		const options = {
			method: 'POST' as IHttpRequestMethods,
			url: 'https://www.signal-spam.fr/api/signaler',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'User-Agent': 'n8n-signalspam-node/1.0'
			},
			body: postData,
		};

		try {
			const response = await executeFunctions.helpers.httpRequest(options);

			return {
				status: 'success',
				response: response,
				id: this.generateReportId()
			};
		} catch (error) {
			throw new Error(`HTTP request failed: ${error.message}`);
		}
	}

	private generateReportId(): string {
		return `SS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}
}
