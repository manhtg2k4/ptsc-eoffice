"use client";

import React from "react";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { useRouter } from "@pages/AdministrationSystem/FunctionManagement/components/CmsModule/shimNav";

export default function ErrorState({
    title = "Ối! Đã có lỗi xảy ra",
    message = "Rất tiếc, chúng tôi không thể tải nội dung ngay bây giờ.",
    errorDetail,
    onRetry,
    homeUrl = "/",
    onHomeClick
}) {
    const router = useRouter();

    const handleHomeClick = () => {
        if (onHomeClick) {
            onHomeClick();
        } else {
            router.push(homeUrl);
        }
    };

    return (
        <div style={{
            padding: "clamp(40px, 10vw, 100px) 24px",
            textAlign: "center",
            minHeight: '60vh',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%'
        }}>
            <div style={{
                background: '#fff',
                padding: 'clamp(24px, 5vw, 48px)',
                borderRadius: '24px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)',
                maxWidth: '500px',
                width: '100%',
                border: '1px solid #f1f5f9'
            }}>
                <div style={{
                    width: 'clamp(60px, 15vw, 80px)',
                    height: 'clamp(60px, 15vw, 80px)',
                    background: '#fee2e2',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    color: '#ef4444'
                }}>
                    <AlertCircle size={32} />
                </div>

                <h2 style={{
                    fontSize: 'clamp(20px, 5vw, 24px)',
                    fontWeight: 800,
                    color: '#1e293b',
                    marginBottom: '12px'
                }}>
                    {title}
                </h2>

                <p style={{
                    color: '#64748b',
                    lineHeight: 1.6,
                    marginBottom: '32px',
                    fontSize: 'clamp(14px, 4vw, 16px)'
                }}>
                    {message}
                    {errorDetail && (
                        <>
                            <br />
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>(Chi tiết: {errorDetail})</span>
                        </>
                    )}
                </p>

                <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px clamp(16px, 4vw, 24px)',
                                borderRadius: '12px',
                                background: '#0066cc',
                                color: '#fff',
                                border: 'none',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontSize: '14px'
                            }}
                        >
                            <RefreshCcw size={18} /> Thử lại
                        </button>
                    )}

                    <button
                        onClick={handleHomeClick}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px clamp(16px, 4vw, 24px)',
                            borderRadius: '12px',
                            background: '#fff',
                            color: '#1e293b',
                            border: '1px solid #e2e8f0',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '14px'
                        }}
                    >
                        <Home size={18} /> Trang chủ
                    </button>
                </div>
            </div>
        </div>
    );
}
