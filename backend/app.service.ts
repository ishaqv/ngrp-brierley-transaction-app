import {Injectable} from '@nestjs/common';
import axios from 'axios';
import * as moment from 'moment';

@Injectable()
export class AppService {
    async downloadPayload(requestData: { transactionId: string, transactionDate: Date }) {
        const selectedDate = moment(requestData.transactionDate);
        const beforeDate = selectedDate.clone().subtract(1, 'day').format('YYYY-MM-DD');
        const afterDate = selectedDate.clone().add(1, 'day').format('YYYY-MM-DD');
        const timeframe = `(timestamp > todatetime("${beforeDate}") and timestamp < todatetime("${afterDate}"))`;
        const data = {
            query: `let relevant_traces = traces | where (cloud_RoleName == "brierley_service" or cloud_RoleName endswith "brierley-transaction-azfunctionapp")
                        and ${timeframe}
                        and message has "-${requestData.transactionId}-"
                        and message has "-${selectedDate.format('YYYY-MM-DD')}";
                        relevant_traces
                        | where message has "Evaluate Discounts Request: "
                            or message has "Evaluate Discounts Search success. Response - "
                            or message has "Transaction Request"
                            or message has "Transaction post success. Response -" 
                        | project timestamp, message`.replace(/\\\\\\/g, '')
        };
        let appInsightsResponse = undefined;
        try {
            appInsightsResponse = await axios.post(
                `${process.env.APP_INSIGHTS_API_BASE_URL}/v1/apps/${process.env.APP_INSIGHTS_APPLICATION_ID}/query`,
                data,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': process.env.APP_INSIGHTS_API_KEY,
                    },
                }
            );

        } catch (e) {
            console.error(e);
            throw e;
        }

        return appInsightsResponse.data;
    }

    authorizePassword(requestData: { password: string }) {
        return { "isValid": requestData.password.trim() === process.env.SECRET_KEY.trim() };
    }
}
