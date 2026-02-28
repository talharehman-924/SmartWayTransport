import React from 'react';

export default function DriverVoucherTemplate({ driverData, pdfRef }) {
    if (!driverData) return null;

    return (
        <div ref={pdfRef} style={{
            position: 'absolute',
            top: '-10000px',
            left: 0,
            width: '1000px',
            background: '#f8fafc',
            color: '#1e293b',
            fontFamily: "'Roboto', sans-serif",
            lineHeight: 1.6,
            padding: '20px'
        }}>
            <style>{`
            .pdf-card {
                background: #ffffff;
                border-radius: 20px;
                padding: 32px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                position: relative;
                overflow: visible;
                margin-bottom: 24px;
                border: 1px solid #e2e8f0;
            }
            .pdf-watermark {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                opacity: 0.4;
                pointer-events: none;
                z-index: 0;
                width: 50%;
                height: auto;
            }
            .pdf-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
                position: relative;
                z-index: 1;
            }
            .pdf-header img {
                height: 200px;
                filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
            }
            .pdf-title {
                text-align: right;
                font-size: 24px;
                font-weight: 900;
                color: #2563eb;
                letter-spacing: -0.025em;
            }
            .pdf-section {
                margin-top: 24px;
                padding: 16px 20px;
                border-radius: 16px;
                background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
                color: white;
                font-weight: 700;
                word-break: break-word;
                font-size: 16px;
                letter-spacing: 0.025em;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                position: relative;
                z-index: 1;
            }
            .pdf-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                margin-top: 16px;
                position: relative;
                z-index: 1;
            }
            .pdf-grid-item label {
                display: block;
                font-weight: 700;
                color: #64748b;
                margin-bottom: 8px;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .pdf-fake-field {
                display: block;
                width: 100%;
                padding: 12px 16px;
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                box-sizing: border-box;
                background: #ffffff;
                color: #1e293b;
                line-height: 1.5;
                min-height: 48px;
                overflow: visible;
                word-wrap: break-word;
                font-family: inherit;
                font-size: 14px;
            }
            .pdf-footer {
                margin-top: 32px;
                padding-top: 24px;
                text-align: center;
                color: #64748b;
                border-top: 2px dashed #2563eb;
                font-size: 14px;
                position: relative;
                z-index: 1;
            }
            .pdf-footer > div:first-child {
                font-weight: 700;
                color: #1e293b;
                margin-bottom: 16px;
                white-space: nowrap;
            }
            .pdf-contact-links {
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin-bottom: 20px;
            }
            .pdf-contact-row {
                display: flex;
                gap: 20px;
                justify-content: center;
                flex-wrap: wrap;
            }
            .pdf-contact-item {
                display: flex;
                align-items: center;
                gap: 12px;
                color: #64748b;
                text-decoration: none;
                padding: 8px 12px;
                border-radius: 8px;
                background: rgba(37, 99, 235, 0.05);
                border: 1px solid rgba(37, 99, 235, 0.1);
            }
            .pdf-contact-item svg {
                color: #2563eb;
                flex-shrink: 0;
            }
            .pdf-social-links {
                display: flex;
                gap: 16px;
                justify-content: center;
            }
            .pdf-social-item {
                display: flex;
                align-items: center;
                gap: 8px;
                color: #64748b;
                text-decoration: none;
                padding: 10px 16px;
                border-radius: 8px;
                background: rgba(37, 99, 235, 0.05);
                border: 1px solid rgba(37, 99, 235, 0.1);
                font-weight: 500;
            }
            .pdf-social-item svg {
                color: #2563eb;
                flex-shrink: 0;
            }
           `}</style>
            <div className="pdf-card">
                <img className="pdf-watermark" src="/output-onlinepngtools.png" alt="Logo Watermark" />

                <div className="pdf-header">
                    <img src="/output-onlinepngtools.png" alt="Company Logo" />
                    <div className="pdf-title">DRIVER VOUCHER</div>
                </div>

                <div className="pdf-section">Voucher Details</div>
                <div className="pdf-grid">
                    <div className="pdf-grid-item">
                        <label>ID</label>
                        <div className="pdf-fake-field">{driverData.id || '-'}</div>
                    </div>
                    <div className="pdf-grid-item">
                        <label>Sr. No</label>
                        <div className="pdf-fake-field">BKG-{driverData.id || '-'}</div>
                    </div>
                    <div className="pdf-grid-item">
                        <label>Voucher Date</label>
                        <div className="pdf-fake-field">{driverData.date || '-'}</div>
                    </div>
                    <div className="pdf-grid-item">
                        <label>Voucher Time</label>
                        <div className="pdf-fake-field">{driverData.pickupTime || '-'}</div>
                    </div>
                    <div className="pdf-grid-item">
                        <label>Status</label>
                        <div className="pdf-fake-field">Success</div>
                    </div>
                    <div className="pdf-grid-item">
                        <label>Approved By</label>
                        <div className="pdf-fake-field">SmartWay Transport</div>
                    </div>
                </div>

                <div className="pdf-section">Driver Details</div>
                <div className="pdf-grid">
                    <div className="pdf-grid-item">
                        <label>Driver Name</label>
                        <div className="pdf-fake-field">{driverData.driverName || '-'}</div>
                    </div>
                    <div className="pdf-grid-item">
                        <label>Driver Contact</label>
                        <div className="pdf-fake-field">{driverData.driverContact || '-'}</div>
                    </div>
                    <div className="pdf-grid-item">
                        <label>Vehicle Reg. Number</label>
                        <div className="pdf-fake-field">{driverData.driverRegNo || '-'}</div>
                    </div>
                    <div className="pdf-grid-item">
                        <label>Shirqa Name</label>
                        <div className="pdf-fake-field">{driverData.shirqaName || '-'}</div>
                    </div>
                    <div className="pdf-grid-item">
                        <label>Referred By</label>
                        <div className="pdf-fake-field">{driverData.referByName || '-'}</div>
                    </div>
                    <div className="pdf-grid-item">
                        <label>Referral Contact</label>
                        <div className="pdf-fake-field">{driverData.referralContact || '-'}</div>
                    </div>
                </div>

                <div className="pdf-section">Passenger Details</div>
                <div className="pdf-grid">
                    <div className="pdf-grid-item">
                        <label>Passenger Name</label>
                        <div className="pdf-fake-field">{driverData.clientName || '-'}</div>
                    </div>
                    <div className="pdf-grid-item">
                        <label>Passenger Contact</label>
                        <div className="pdf-fake-field">{driverData.clientContact || '-'}</div>
                    </div>
                    <div className="pdf-grid-item">
                        <label>Passenger Location</label>
                        <div className="pdf-fake-field">{driverData.pickupLocation || '-'}</div>
                    </div>
                    <div className="pdf-grid-item" style={{ gridColumn: "span 3" }}>
                        <label>Luggage Details</label>
                        <div className="pdf-fake-field">
                            {driverData.luggageSuitcase || 0}S {driverData.luggageHandCarry || 0}H {driverData.luggageCarton || 0}C {driverData.luggageStroller || 0}St {driverData.luggageWheelchair || 0}W
                        </div>
                    </div>
                </div>

                <div className="pdf-section">Vehicle & Routes</div>
                <div className="pdf-grid">
                    <div className="pdf-grid-item">
                        <label>Vehicle Type</label>
                        <div className="pdf-fake-field">{driverData.vehicle || '-'}</div>
                    </div>
                    <div className="pdf-grid-item">
                        <label>No. of Passengers</label>
                        <div className="pdf-fake-field">{(Number(driverData.adults) || 0) + (Number(driverData.children) || 0)} ({(Number(driverData.adults) || 0)} A, {(Number(driverData.children) || 0)} C)</div>
                    </div>
                    <div className="pdf-grid-item">
                        <label>Total Duration</label>
                        <div className="pdf-fake-field">{driverData.totalDuration || '-'}</div>
                    </div>
                    <div className="pdf-grid-item" style={{ gridColumn: 'span 3' }}>
                        <label>Special Request</label>
                        <div className="pdf-fake-field">{driverData.specialRequest || 'None'}</div>
                    </div>
                    <div className="pdf-grid-item">
                        <label>Pick Up Date & Time</label>
                        <div className="pdf-fake-field">{driverData.date || '-'} {driverData.pickupTime || ''}</div>
                    </div>
                    <div className="pdf-grid-item" style={{ gridColumn: 'span 2' }}>
                        <label>Drop-off Location</label>
                        <div className="pdf-fake-field">{driverData.dropoffLocation || driverData.package || '-'}</div>
                    </div>
                    <div className="pdf-grid-item">
                        <label>Advance (SAR)</label>
                        <div className="pdf-fake-field">{driverData.advanceSAR || '0'} SAR</div>
                    </div>
                    <div className="pdf-grid-item">
                        <label>Total (SAR)</label>
                        <div className="pdf-fake-field">{driverData.paymentSAR || '0'} SAR</div>
                    </div>
                    <div className="pdf-grid-item">
                        <label>Commission (SAR)</label>
                        <div className="pdf-fake-field">{driverData.commissionSAR || '0'} SAR</div>
                    </div>
                </div>

                <div className="pdf-footer">
                    <div>CONTACT:</div>
                    <div className="pdf-contact-links">
                        <div className="pdf-contact-row">
                            <div className="pdf-contact-item">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                                </svg>
                                +966 53 589 1901
                            </div>
                            <div className="pdf-contact-item">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                                </svg>
                                +92 334 224 6669
                            </div>
                            <div className="pdf-contact-item">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                                </svg>
                                smartwaytransport7@gmail.com
                            </div>
                        </div>
                    </div>
                    <div className="pdf-social-links">
                        <div className="pdf-social-item">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            SmartWay Transport
                        </div>
                        <div className="pdf-social-item">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                            </svg>
                            SmartwayTransport7
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
