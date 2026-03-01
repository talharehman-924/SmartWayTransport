export async function syncToGoogleSheet(bookingData) {
    try {
        const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEBHOOK;
        if (!webhookUrl) return;

        await fetch(webhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'sync',
                data: bookingData,
                timestamp: new Date().toISOString()
            })
        });
    } catch (error) {
        console.error("Google Sheets Sync Failed:", error);
    }
}
