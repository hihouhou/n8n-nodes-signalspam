import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SignalSpamApi implements ICredentialType {
	name = 'SignalSpamApi';
	displayName = 'SignalSpam Credentials';
	documentationUrl = 'https://www.signal-spam.fr/';
	properties: INodeProperties[] = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your SignalSpam username',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Your SignalSpam password',
		},
	];
}
