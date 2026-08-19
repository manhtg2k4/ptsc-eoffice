import { useNavigate, useLocation, useSearchParams as useBaseSearchParams } from 'react-router-dom';

export const useRouter = () => {
    const navigate = useNavigate();
    return {
        push: (p) => navigate(p),
        replace: (p) => navigate(p, {replace: true}),
        back: () => navigate(-1),
        prefetch: () => {}
    };
};

export const usePathname = () => {
    return useLocation().pathname;
};

export const useSearchParams = () => {
    const [searchParams] = useBaseSearchParams();
    return searchParams;
};
