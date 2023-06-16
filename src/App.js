import React, {useEffect, useState} from 'react';
import axios from 'axios';
import {saveAs} from 'file-saver';
import {toast, ToastContainer} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import loadingSpinner from './loading_spinner.gif';

const App = () => {
    const [transactionId, setTransactionId] = useState('');
    const [loading, setLoading] = useState(false);
    const handleDownload = async () => {
        if (transactionId.trim() === '') {
            callToast('Please enter a Transaction ID');
            return;
        }
        setLoading(true);
        try {
            const timeframe = 'timestamp >= ago(30d)';
            const data = {
                query:`let requests = traces | where message has "Transaction Request" and message has "${transactionId}" and ${timeframe} | extend request = split(message, "Transaction Request: ")[1] | project request, operation_Id; let responses = traces | where message has "Transaction post success. Response -" and message has "${transactionId}" and ${timeframe} | extend response = split(message, "Transaction post success. Response - ")[1] | project response, operation_Id; requests | join kind=inner responses on operation_Id | extend payload = bag_pack("request", request, "response", response) | project payload`.replace(/\\\\\\/g, "")
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
            if (response.data["tables"][0].rows.length === 0) {
                callToast('Transaction data not found');
                return;
            }
            const formattedResponse = JSON.stringify(JSON.parse(response.data["tables"][0].rows[0][0]), null, 2);
            const fileBlob = new Blob([formattedResponse], { type: 'application/json' });
            saveAs(fileBlob, `transaction_payload_${transactionId}.json`);
        } catch (error) {
            callToast('Error occurred while retrieving transaction payload');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
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
                NGRP Brierley Portal
            </h1>
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
                    <tr style={{ height: '70px' }}>
                        <td></td>
                        <td align={"center"} >
                            {loading ? (
                                <img
                                    src={loadingSpinner}
                                    alt="Downloading..."
                                    style={{ width: '40px', height: '40px' }}
                                />
                            ) : (
                                <button
                                    onClick={handleDownload}
                                    style={{
                                        fontWeight: "bold",
                                        marginTop: '16px',
                                        padding: '8px 16px',
                                        fontSize: '16px',
                                        borderRadius: '4px',
                                        backgroundColor: '#2a2222',
                                        color: '#fff',
                                        border: 'none',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Download
                                </button>
                            )}
                        </td>
                    </tr>
                    </tbody>
                </table>
            </div>
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
