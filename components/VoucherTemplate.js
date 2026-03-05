import React from 'react';

export default function VoucherTemplate({ bookingData, pdfRef }) {
  if (!bookingData) return null;

  return (
    <div ref={pdfRef} style={{
      position: 'absolute',
      top: '-10000px',
      left: 0,
      width: '900px',
      background: '#ffffff',
      color: '#1e293b',
      fontFamily: "'Inter', 'Roboto', sans-serif",
      lineHeight: 1.5,
      padding: '40px',
      boxSizing: 'border-box'
    }}>
      <style>{`
            .pdf-watermark {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                opacity: 0.1;
                pointer-events: none;
                z-index: 0;
                width: 60%;
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
                height: 80px;
                object-fit: contain;
            }
            .pdf-title {
                text-align: right;
                font-size: 26px;
                font-weight: 800;
                color: #2563eb;
                letter-spacing: 0.02em;
                text-transform: uppercase;
            }
            .pdf-section {
                margin-top: 20px;
                padding: 10px 16px;
                border-radius: 6px;
                background: #4b94fa;
                color: #ffffff;
                font-weight: 600;
                font-size: 14px;
                position: relative;
                z-index: 1;
            }
            .pdf-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 16px;
                margin-top: 12px;
                position: relative;
                z-index: 1;
            }
            .pdf-grid.cols-2 {
                 grid-template-columns: repeat(2, 1fr);
            }
            .pdf-grid.cols-1 {
                grid-template-columns: 1fr;
            }
            .pdf-grid-item label {
                display: block;
                font-weight: 700;
                color: #64748b;
                margin-bottom: 4px;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.02em;
            }
            .pdf-fake-field {
                display: block;
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                box-sizing: border-box;
                background: #ffffff;
                color: #334155;
                font-size: 13px;
                min-height: 40px;
            }
            .pdf-subtext {
                font-size: 12px;
                color: #64748b;
                margin-top: 8px;
                margin-bottom: 4px;
            }
            .pdf-footer {
                margin-top: 40px;
                padding-top: 20px;
                text-align: center;
                border-top: 2px dashed #93c5fd;
                position: relative;
                z-index: 1;
            }
            .pdf-footer-title {
                font-size: 12px;
                font-weight: 800;
                color: #1e293b;
                margin-bottom: 12px;
            }
            .pdf-contact-row {
                display: flex;
                gap: 16px;
                justify-content: center;
                flex-wrap: wrap;
                margin-bottom: 10px;
            }
            .pdf-contact-item {
                display: flex;
                align-items: center;
                gap: 8px;
                color: #475569;
                padding: 6px 12px;
                border-radius: 6px;
                background: #f1f5f9;
                font-size: 12px;
                font-weight: 500;
            }
            .pdf-contact-item svg {
                color: #2563eb;
                width: 16px;
                height: 16px;
            }
           `}</style>
      <img className="pdf-watermark" src="/output-onlinepngtools.png" alt="Logo Watermark" />

      <div className="pdf-header">
        <img src="/output-onlinepngtools.png" alt="Company Logo" />
        <div className="pdf-title">TRANSPORT VOUCHER</div>
      </div>

      <div className="pdf-section">Voucher Details</div>
      <div className="pdf-grid">
        <div className="pdf-grid-item">
          <label>CUSTOMER ID</label>
          <div className="pdf-fake-field">{bookingData.id || '-'}</div>
        </div>
        <div className="pdf-grid-item">
          <label>SR. NO</label>
          <div className="pdf-fake-field">BKG-{bookingData.id || '-'}</div>
        </div>
        <div className="pdf-grid-item">
          <label>VOUCHER DATE</label>
          <div className="pdf-fake-field">{bookingData.date || '-'}</div>
        </div>
        <div className="pdf-grid-item">
          <label>VOUCHER TIME</label>
          <div className="pdf-fake-field">{bookingData.pickupTime || '-'}</div>
        </div>
        <div className="pdf-grid-item">
          <label>STATUS</label>
          <div className="pdf-fake-field">Success</div>
        </div>
        <div className="pdf-grid-item">
          <label>APPROVED BY</label>
          <div className="pdf-fake-field">SmartWay Transport</div>
        </div>
      </div>

      <div className="pdf-section">Customer Details</div>
      <div className="pdf-subtext">Total Customers: {(Number(bookingData.adults) || 0) + (Number(bookingData.children) || 0)}</div>

      <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', zIndex: 1, position: 'relative', background: 'rgba(255,255,255,0.7)' }}>
        <div className="pdf-grid" style={{ marginTop: 0 }}>
          <div className="pdf-grid-item">
            <label>Customer Name</label>
            <div className="pdf-fake-field">{bookingData.clientName || '-'}</div>
          </div>
          <div className="pdf-grid-item">
            <label>Contact No</label>
            <div className="pdf-fake-field">{bookingData.clientContact || '-'}</div>
          </div>
          <div className="pdf-grid-item">
            <label>Nationality</label>
            <div className="pdf-fake-field">{bookingData.nationality || '-'}</div>
          </div>
        </div>
        <div className="pdf-grid" style={{ marginTop: 12 }}>
          <div className="pdf-grid-item">
            <label>Adults</label>
            <div className="pdf-fake-field">{bookingData.adults || 0}</div>
          </div>
          <div className="pdf-grid-item">
            <label>Children</label>
            <div className="pdf-fake-field">{bookingData.children || 0}</div>
          </div>
          <div className="pdf-grid-item">
            <label>Total Passengers</label>
            <div className="pdf-fake-field">{(Number(bookingData.adults) || 0) + (Number(bookingData.children) || 0)}</div>
          </div>
        </div>
      </div>

      <div className="pdf-section">Luggage Details</div>
      <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '12px', zIndex: 1, position: 'relative', background: 'rgba(255,255,255,0.7)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Suitcase</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Hand Carry</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Carton</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Stroller</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Wheelchair</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, fontSize: '15px', color: '#334155' }}>{bookingData.luggageSuitcase || 0}</td>
              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, fontSize: '15px', color: '#334155' }}>{bookingData.luggageHandCarry || 0}</td>
              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, fontSize: '15px', color: '#334155' }}>{bookingData.luggageCarton || 0}</td>
              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, fontSize: '15px', color: '#334155' }}>{bookingData.luggageStroller || 0}</td>
              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, fontSize: '15px', color: '#334155' }}>{bookingData.luggageWheelchair || 0}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="pdf-section">Vehicle & Routes</div>
      <div className="pdf-grid">
        <div className="pdf-grid-item">
          <label>VEHICLE TYPE</label>
          <div className="pdf-fake-field">{bookingData.vehicle || '-'}</div>
        </div>
        <div className="pdf-grid-item">
          <label>NO. OF PASSENGERS</label>
          <div className="pdf-fake-field">{(Number(bookingData.adults) || 0) + (Number(bookingData.children) || 0)}</div>
        </div>
        <div className="pdf-grid-item">
          <label>SPECIAL REQUEST</label>
          <div className="pdf-fake-field">{bookingData.specialRequest || '-'}</div>
        </div>
      </div>

      <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '12px', zIndex: 1, position: 'relative', background: 'rgba(255,255,255,0.7)' }}>
        <div className="pdf-grid cols-2" style={{ marginTop: 0 }}>
          <div className="pdf-grid-item">
            <label>Pick Up Location</label>
            <div className="pdf-fake-field">{bookingData.pickupLocation || '-'}</div>
          </div>
          <div className="pdf-grid-item">
            <label>Pick Up Time</label>
            <div className="pdf-fake-field">{bookingData.pickupTime || '-'}</div>
          </div>
        </div>

        <div className="pdf-grid cols-2">
          <div className="pdf-grid-item">
            <label>Drop Off Location</label>
            <div className="pdf-fake-field">{bookingData.dropoffLocation || '-'}</div>
          </div>
          <div className="pdf-grid-item">
            <label>Package / Route</label>
            <div className="pdf-fake-field" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              {(bookingData.package || '-').split(', ').filter(Boolean).map((pkg, i) => (
                <span key={i} style={{
                  background: '#e0f2fe', color: '#0369a1', padding: '3px 10px',
                  borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                  border: '1px solid #bae6fd',
                }}>{pkg}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="pdf-grid">
          <div className="pdf-grid-item">
            <label>Advance SAR</label>
            <div className="pdf-fake-field">{bookingData.advanceSAR || '0'} SAR</div>
          </div>
          <div className="pdf-grid-item">
            <label>Total SAR</label>
            <div className="pdf-fake-field">{bookingData.paymentSAR || '0'} SAR</div>
          </div>
          <div className="pdf-grid-item">
            <label>Tour Duration</label>
            <div className="pdf-fake-field">{bookingData.totalDuration || '-'}</div>
          </div>
        </div>
      </div>

      <div className="pdf-footer">
        <div className="pdf-footer-title">CONTACT:</div>
        <div className="pdf-contact-row">
          <div className="pdf-contact-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            +966 53 589 1901
          </div>
          <div className="pdf-contact-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            +92 334 224 6669
          </div>
          <div className="pdf-contact-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            smartwaytransport7@gmail.com
          </div>
        </div>
        <div className="pdf-contact-row">
          <div className="pdf-contact-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            SmartWay Transport
          </div>
          <div className="pdf-contact-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            SmartwayTransport7
          </div>
        </div>
      </div>
    </div>
  );
}
