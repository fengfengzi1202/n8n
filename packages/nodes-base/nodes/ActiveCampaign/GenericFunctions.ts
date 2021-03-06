import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject, ILoadOptionsFunctions,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';

export interface IProduct {
	fields: {
		item?: object[];
	};
}


/**
 * Make an API request to ActiveCampaign
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function activeCampaignApiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: IDataObject, query?: IDataObject, dataKey?: string): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('activeCampaignApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	if (query === undefined) {
		query = {};
	}

	const options: OptionsWithUri = {
		headers: {
			'Api-Token': credentials.apiKey,
		},
		method,
		qs: query,
		uri: `${credentials.apiUrl}${endpoint}`,
		json: true
	};

	if (Object.keys(body).length !== 0) {
		options.body = body;
	}

	try {
		const responseData = await this.helpers.request!(options);

		if (responseData.success === false) {
			throw new Error(`ActiveCampaign error response: ${responseData.error} (${responseData.error_info})`);
		}

		if (dataKey === undefined) {
			return responseData;
		} else {
			return responseData[dataKey] as IDataObject;
		}

	} catch (error) {
		if (error.statusCode === 403) {
			// Return a clear error
			throw new Error('The ActiveCampaign credentials are not valid!');
		}

		// If that data does not exist for some reason return the actual error
		throw error;
	}
}



/**
 * Make an API request to paginated ActiveCampaign endpoint
 * and return all results
 *
 * @export
 * @param {(IHookFunctions | IExecuteFunctions)} this
 * @param {string} method
 * @param {string} endpoint
 * @param {IDataObject} body
 * @param {IDataObject} [query]
 * @returns {Promise<any>}
 */
export async function activeCampaignApiRequestAllItems(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: IDataObject, query?: IDataObject, dataKey?: string): Promise<any> { // tslint:disable-line:no-any

	if (query === undefined) {
		query = {};
	}
	query.limit = 100;
	query.offset = 0;

	const returnData: IDataObject[] = [];

	let responseData;

	let itemsReceived = 0;
	do {
		responseData = await activeCampaignApiRequest.call(this, method, endpoint, body, query);

		if (dataKey === undefined) {
			returnData.push.apply(returnData, responseData);
			if (returnData !== undefined) {
				itemsReceived += returnData.length;
			}
		} else {
			returnData.push.apply(returnData, responseData[dataKey]);
			if (responseData[dataKey] !== undefined) {
				itemsReceived += responseData[dataKey].length;
			}
		}

		query.offset = itemsReceived;
	} while (
		responseData.meta !== undefined &&
		responseData.meta.total !== undefined &&
		responseData.meta.total > itemsReceived
	);

	return returnData;
}
