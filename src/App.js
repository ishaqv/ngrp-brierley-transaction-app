import React, {useEffect, useState} from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import loadingSpinner from './loading_spinner.gif';
import 'sweetalert2/dist/sweetalert2.min.css';
import Swal from 'sweetalert2';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import moment from 'moment';

const App = () => {
    const [transactionId, setTransactionId] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordValidated, setPasswordValidated] = useState(false);
    const [transactionDate, setTransactionDate] = useState(null);
    const [transactionDateError] = useState(false);

    const handleTransactionDateChange = (date) => {
        setTransactionDate(date);
    };

    const handleDownload = async () => {
        if (transactionId.trim() === '') {
            callToast('Please enter a transaction ID');
            return;
        }
        if (!transactionDate) {
            callToast('Please choose a business period');
            return;
        }
        setLoading(true);
        try {
            const selectedDate = moment(transactionDate);
            const beforeDate = selectedDate.clone().subtract(1, 'day').format('YYYY-MM-DD');
            const afterDate = selectedDate.clone().add(1, 'day').format('YYYY-MM-DD');

            const timeframe = `(timestamp > todatetime("${beforeDate}") and timestamp < todatetime("${afterDate}"))`;
            const data = {
                query:
                    `let relevant_traces = traces | where (cloud_RoleName == "brierley_service" or cloud_RoleName endswith "brierley-transaction-azfunctionapp")
                        and ${timeframe}
                        and message has "-${transactionId}-";
                        let transaction_request = relevant_traces
                        | where message has "Transaction Request"
                        | extend request = split(message, "Transaction Request: ")[1] 
                        | project request, operation_Id, timestamp;
                        let evaluate_discount_request = relevant_traces
                        | where message has "Evaluate Discounts Request: "
                        | extend request = split(message, "Evaluate Discounts Request: ")[1] 
                        | project request, operation_Id, timestamp;
                        let transaction_response = relevant_traces
                        | where message has "Transaction post success. Response -" 
                        | extend response = split(message, "Transaction post success. Response - ")[1] 
                        | project response, operation_Id;
                        let evaluate_discount_response = relevant_traces
                        | where message has "Evaluate Discounts Search success. Response - " 
                        | extend response = split(message, "Evaluate Discounts Search success. Response - ")[1] 
                        | project response, operation_Id;
                        let transaction_payloads = transaction_request 
                        | join kind=inner transaction_response on operation_Id 
                        | extend transaction_payload = bag_pack("request", request, "response", response) 
                        | project transaction_payload, timestamp;
                        let evaluate_discount_payloads = evaluate_discount_request 
                        | join kind=inner evaluate_discount_response on operation_Id 
                        | extend evaluate_discount_payload = bag_pack("request", request, "response", response) 
                        | project evaluate_discount_payload, timestamp;
                        union transaction_payloads, evaluate_discount_payloads
                        | extend payload = bag_pack("timestamp[UTC]", timestamp, "transaction", transaction_payload, "evaluate_discount", evaluate_discount_payload)
                        | order by timestamp asc nulls last  
                        | project payload`.replace(/\\\\\\/g, '')
            };
            const response = await axios.post(
                `${process.env.REACT_APP_APP_INSIGHTS_API_BASE_URL}/v1/apps/${process.env.REACT_APP_APP_INSIGHTS_APPLICATION_ID}/query`,
                data,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': process.env.REACT_APP_APP_INSIGHTS_API_KEY,
                    },
                }
            );
            if (response.data['tables'][0].rows.length === 0) {
                callToast('The data you requested was not found in our records.');
                return;
            }
            const formattedResponse = JSON.stringify(response.data['tables'][0].rows, null, 2);
            const fileBlob = new Blob([formattedResponse], { type: 'application/json' });
            saveAs(fileBlob, `brierley_transaction_payload_${transactionId}.json`);
        } catch (error) {
            console.error(error);
            callToast('An error occurred while retrieving data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const promptPassword = async () => {
            try {
                const { value: enteredPassword } = await Swal.fire({
                    title: 'Enter the secret key',
                    input: 'password',
                    inputAttributes: {
                        autocapitalize: 'off',
                        autocorrect: 'off',
                    },
                    showCancelButton: false,
                    confirmButtonText: 'Submit',
                    inputValidator: (value) => {
                        if (!value) {
                            return 'Please enter the secret key';
                        }
                    },
                });

                if (enteredPassword === process.env.REACT_APP_SECRET_KEY) {
                    setPasswordValidated(true);
                } else {
                    await Swal.fire({
                        icon: 'error',
                        title: 'Incorrect secret',
                        text: 'Please enter the correct secret key',
                    });
                    promptPassword();
                }
            } catch (error) {
            }
        };

        promptPassword();
        document.title = 'Download Payload';

    }, []);

    return (
        <>
            <h1
                style={{
                    textAlign: 'center',
                    fontSize: '32px',
                    color: 'black',
                    marginTop: '40px',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
                }}
            >
                NGRP Brierley Transaction Portal
            </h1>
            {passwordValidated ? (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100vh',
                        textAlign: 'center',
                        backgroundColor: '#b2b3b3', // Ash shaded color
                    }}
                >
                    <table>
                        <tbody>
                        <tr>
                            <td style={{ width: '120px' }}>
                                <label htmlFor="transactionId">Transaction ID</label>
                            </td>
                            <td>
                                <input
                                    id="transactionId"
                                    type="text"
                                    value={transactionId}
                                    onChange={(e) => setTransactionId(e.target.value)}
                                    style={{
                                        padding: '8px',
                                        fontSize: '16px',
                                        borderRadius: '4px',
                                        border: '1px solid #ccc',
                                    }}
                                />
                            </td>
                        </tr>
                            <tr>
                                <td style={{ width: '200px' }}>
                                    <label htmlFor="transactionDate">Business Period</label>
                                </td>
                                <td>
                                    <DatePicker
                                        id="transactionDate"
                                        selected={transactionDate}
                                        onChange={handleTransactionDateChange}
                                        dateFormat="yyyy-MM-dd"
                                        maxDate={new Date()}
                                        className={`datepicker-input ${transactionDateError ? 'invalid' : ''}`}
                                        inputProps={{readOnly: true}}
                                        onFocus={e => e.target.blur()}

                                    />

                                </td>
                            </tr>

                        <tr style={{ height: '70px' }}>
                            <td></td>
                            <td align={'center'}>
                                {loading ? (
                                    <img
                                        src={loadingSpinner}
                                        alt="Downloading..."
                                        style={{ width: '40px', height: '40px' }}
                                    />
                                ) : (
                                    <button onClick={handleDownload} style={{
                                        fontWeight: "bold",
                                        marginTop: '16px',
                                        padding: '8px 16px',
                                        fontSize: '16px',
                                        borderRadius: '4px',
                                        backgroundColor: '#2a2222',
                                        color: '#fff',
                                        border: 'none',
                                        cursor: 'pointer',
                                    }}>
                                        Download
                                    </button>
                                )}
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            ) : null}
            <ToastContainer
                position="top-center"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
            />
        </>
    );
};

function callToast(message) {
    toast.error(message, {
        position: 'top-center',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'colored',
    });
}

export default App;
