import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Copy, Check, Mail } from 'lucide-react';
import * as S from './ShareModal.styles';

// ─── Icons ────────────────────────────────────────────────────────────────────
function FacebookIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
    );
}

// function TwitterIcon() {
//     return (
//         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//             <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
//         </svg>
//     );
// }

// function LinkedinIcon() {
//     return (
//         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//             <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
//             <rect x="2" y="9" width="4" height="12" />
//             <circle cx="4" cy="4" r="2" />
//         </svg>
//     );
// }

// function ZaloIcon() {
//     return (
//         <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
//             <path d="M9.77778 30.6667H14.6667C15.9096 30.6667 17.1017 30.1729 17.9807 29.294C18.8597 28.415 19.3535 27.2229 19.3535 25.98V14.6667C17.636 14.6133 16.5156 14.6667 14.6667 14.6667H9.77778V30.6667ZM18.4444 32.8889C18.4444 33.1979 18.4239 33.5042 18.3842 33.8055C18.5283 33.854 18.6806 33.8889 18.8344 33.8889C19.7828 33.8889 21.0567 33.6 22.0222 32.8889H25.3333C24.4711 32.8889 23.3333 33.4 23.3333 34.6667V37.3333C23.3333 38.0406 23.0524 38.7189 22.5523 39.219C22.0522 39.719 21.3739 40 20.6667 40H12.6667C11.6058 40 10.5884 39.5786 9.83824 38.8284C9.0881 38.0783 8.66667 37.0609 8.66667 36V34C8.66667 33.4 8.26667 32.8889 7.33333 32.8889H5.33333C4.27247 32.8889 3.25505 32.4675 2.50491 31.7173C1.75476 30.9672 1.33333 29.9498 1.33333 28.8889V12C1.33333 10.9391 1.75476 9.92172 2.50491 9.17157C3.25505 8.42143 4.27247 8 5.33333 8H26C27.0609 8 28.0783 8.42143 28.8284 9.17157C29.5786 9.92172 30 10.9391 30 12V24.5778C27.9705 27.5306 24.3639 30.0163 18.4444 32.8889ZM34.6667 22V24.6667H37.3333V27.3333H34.6667V30H32V27.3333H29.3333V24.6667H32V22H34.6667ZM41.3333 12.6667H44V34.6667H41.3333V12.6667ZM37.3333 12.6667H40V18H37.3333V12.6667Z" fill="currentColor" />
//         </svg>
//     );
// }

// ─── Main Component ───────────────────────────────────────────────────────────
function ShareModal({ isOpen, onClose, url, title }) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCopied(false);
        }
    }, [isOpen]);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err); // eslint-disable-line no-console
        }
    }, [url]);

    const handleStopPropagation = useCallback((e) => {
        e.stopPropagation();
    }, []);

    const shareLinks = useMemo(() => [
        {
            name: 'Facebook',
            icon: <FacebookIcon />,
            color: '#1877F2',
            bg: '#e7f5ff',
            url: "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url)
        },
        // {
        //     name: 'Zalo',
        //     icon: <ZaloIcon />,
        //     color: '#0068FF',
        //     bg: '#e5efff',
        //     url: "https://zalo.me/share/?url=" + encodeURIComponent(url)
        // },
        // {
        //     name: 'X',
        //     icon: <TwitterIcon />,
        //     color: '#000000',
        //     bg: '#f0f0f0',
        //     url: "https://twitter.com/intent/tweet?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(title)
        // },
        // {
        //     name: 'LinkedIn',
        //     icon: <LinkedinIcon />,
        //     color: '#0077b5',
        //     bg: '#e1f0f8',
        //     url: "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(url)
        // },
        {
            name: 'Gmail',
            icon: <Mail size={20} />,
            color: '#EA4335',
            bg: '#fce8e6',
            url: "https://mail.google.com/mail/?view=cm&fs=1&tf=1&su=" + encodeURIComponent(title) + "&body=" + encodeURIComponent("Mình chia sẻ cho bạn bài viết này:\n" + url)
        }
    ], [url, title]);

    if (!isOpen) return null;

    return (
        <S.Overlay onClick={onClose}>
            <S.ModalContent onClick={handleStopPropagation}>
                <S.ModalHeader>
                    <S.ModalTitle>Chia sẻ bài viết</S.ModalTitle>
                    <S.CloseButton onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </S.CloseButton>
                </S.ModalHeader>

                <S.ModalBody>
                    <S.Label>Chia sẻ qua mạng xã hội</S.Label>
                    
                    <S.Grid>
                        {shareLinks.map((link) => (
                            <S.SocialButton
                                key={link.name}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                $themeColor={link.color}
                            >
                                <S.IconCircle $themeColor={link.color} $mainBg={link.bg}>
                                    {link.icon}
                                </S.IconCircle>
                                <span>{link.name}</span>
                            </S.SocialButton>
                        ))}
                    </S.Grid>

                    <div className="copy-link-section">
                        <S.CopyLabel>Hoặc sao chép đường dẫn</S.CopyLabel>
                        <S.InputGroup>
                            <S.Input
                                type="text"
                                readOnly
                                value={url}
                            />
                            <S.CopyButton
                                $isCopied={copied}
                                onClick={handleCopy}
                            >
                                {copied ? <Check size={18} /> : <Copy size={18} />}
                                <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                            </S.CopyButton>
                        </S.InputGroup>
                    </div>
                </S.ModalBody>
            </S.ModalContent>
        </S.Overlay>
    );
}

export default ShareModal;