import React, {useEffect, useState} from 'react';
import axios from 'axios';
import {saveAs} from 'file-saver';
import {toast, ToastContainer} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import loadingSpinner from './loading_spinner.gif';
import 'sweetalert2/dist/sweetalert2.min.css';
import Swal from 'sweetalert2';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns'

const App = () => {
    const [transactionId, setTransactionId] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordValidated, setPasswordValidated] = useState(false);
    const [transactionDate, setTransactionDate] = useState(null);
    const handleTransactionDateChange = (date) => {
        setTransactionDate(date);
    };

    function generatePayload(rows) {
        const output = {
            timestamp_utc: '',
            transaction: [],
            evaluate_discounts: []
        };
        rows.forEach((row) => {
            output.timestamp_utc = row[0];
            const message = row[1];
            if (message.includes('Evaluate Discounts Request')) {
                const evaluateDiscountRequestData = message.substring(message.indexOf('{'));
                const parsedJson = JSON.parse(evaluateDiscountRequestData);
                output.evaluate_discounts.push({
                    request: parsedJson
                });
            } else if (message.includes('Evaluate Discounts Search success')) {
                const evaluateDiscountResponseData = message.substring(message.indexOf('{'));
                const parsedJson = JSON.parse(evaluateDiscountResponseData);
                const lastIndex = output.evaluate_discounts.length - 1;
                output.evaluate_discounts[lastIndex].response = parsedJson;
            } else if (message.includes('Transaction Request')) {
                const transactionRequestData = message.substring(message.indexOf('{'));
                const parsedJson = JSON.parse(transactionRequestData);
                output.transaction.push({
                    request: parsedJson
                });
            } else if (message.includes('Transaction post success')) {
                const transactionResponseData = message.substring(message.indexOf('{'));
                const parsedJson = JSON.parse(transactionResponseData);
                const lastIndex = output.transaction.length - 1;
                output.transaction[lastIndex].response = parsedJson;
            }
        });
        return JSON.stringify(output, null, 2);
    }

    const handleDownload = async () => {
        if (transactionId.trim() === '') {
            callToast('Please enter a transaction ID');
            return;
        }
        if (!transactionDate) {
            callToast('Please choose a transaction date');
            return;
        }
        setLoading(true);
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/api/payload/download`,
                {
                    transactionId: transactionId,
                    transactionDate: format(transactionDate, 'yyyy-MM-dd'),
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.data && response.data['tables'][0].rows.length === 0) {
                callToast('The data you requested was not found in our records');
                return;
            }
            const payload = generatePayload(response.data['tables'][0].rows);
            const fileBlob = new Blob([payload], { type: 'application/json' });
            saveAs(fileBlob, `brierley_transaction_payload_${transactionId}.json`);
        } catch (error) {
            console.error(error);
            callToast('An error occurred while processing data');
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
                    confirmButtonText: 'Unlock',
                    inputValidator: (value) => {
                        if (!value) {
                            return 'Please enter the secret key';
                        }
                    },
                });

                const response = await axios.post(
                    `${process.env.REACT_APP_API_URL}/api/payload/authorize`, {
                    password: enteredPassword
                });
                if (response.data.isValid) {
                    setPasswordValidated(true);
                }
                else {
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
                            <td>
                                <label htmlFor="transactionId">Transaction ID</label>
                            </td>
                            <td>
                                <input
                                    id="transactionId"
                                    type="text"
                                    value={transactionId}
                                    onChange={(e) => setTransactionId(e.target.value)}
                                    className={'input'}
                                />
                            </td>
                        </tr>
                            <tr>
                                <td>
                                    <label htmlFor="transactionDate">Transaction Date</label>
                                </td>
                                <td>
                                    <DatePicker
                                        id="transactionDate"
                                        selected={transactionDate}
                                        onChange={handleTransactionDateChange}
                                        dateFormat="yyyy-MM-dd"
                                        maxDate={new Date()}
                                        className={'input'}
                                        inputProps={{readOnly: true}}
                                        onFocus={event => event.target.blur()}
                                    />

                                </td>
                            </tr>
                        <tr>
                            <td></td>
                            <td style={{ textAlign: 'center' }}>
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
