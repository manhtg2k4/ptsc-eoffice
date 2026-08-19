import { useState, useEffect } from "react";

const useDownLg = (breakpoint = 1750) => {
    const [isMatch, setIsMatch] = useState(window.innerWidth <= breakpoint);

    useEffect(() => {
        const handleResize = () => {
            setIsMatch(window.innerWidth <= breakpoint);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [breakpoint]);

    return isMatch;
};

export default useDownLg;
