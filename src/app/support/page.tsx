// pages/support.tsx
import React from 'react';
import RootLayout from '../layout';

export default function Support() {
    return (
        <RootLayout showFooter={true}>
            <div className="flex items-center justify-center p-6">
                <div className="text-wrapper text-[#041D34] space-y-6">
                    <div className="max-w-2xl mx-auto p-8 border border-[#81878D] rounded-xl">
                        <h2 className="text-3xl font-bold mb-4 text-center">Xref.AI</h2>

                        <h4 className="text-xl font-semibold mb-4">Contact Information</h4>

                        <p className="text-lg text-[#0B3C68] mb-4 leading-relaxed">
                            Xref.AI welcomes your questions or comments regarding this application. If you have any inquiries or feedback, please reach out to us at:
                        </p>

                        <div className="text-lg text-[#0B3C68] mb-4">
                            <p>Xref.AI</p>
                            <p>30765 Pacific Coast Hwy #354</p>
                            <p>Malibu, CA</p>
                        </div>

                        <div className="text-lg text-[#0B3C68] mb-6">
                            <p>Email Address:</p>
                            <a href="mailto:info@xref.ai" className="text-blue-400 hover:text-blue-500 transition-colors">
                                info@xref.ai
                            </a>
                        </div>

                        <p className="text-sm text-gray-500">Last updated: September 1, 2024</p>
                    </div>
                </div>
            </div>
        </RootLayout>
    );
}
