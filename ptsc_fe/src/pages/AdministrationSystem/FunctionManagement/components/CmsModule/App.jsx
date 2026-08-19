import React, { useCallback } from "react";
import { CMSProvider, useCMS } from "./context/CMSContext";
import { AuthProvider } from "./context/AuthProvider";
import { PreviewView } from "./components/layout/PreviewView";
import { EditView } from "./components/layout/EditView";
import { AddPageModal } from "./components/dialog/AddPageModal";
import { DeletePageModal } from "./components/dialog/DeletePageModal";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/globals.css";
import "./styles/typography.css";
import { ReduxProvider } from "./redux/ReduxProvider";

const Loading = () => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
    Loading CMS...
  </div>
);

function CMSContent() {
  const cms = useCMS();

  const handleCloseAddPageModal = useCallback(() => {
    cms.setShowAddPageModal(false);
  }, [cms]);

  const handleCloseDeletePageModal = useCallback(() => {
    cms.setShowDeletePageModal(false);
  }, [cms]);

  if (cms.isLoading) {
    return <Loading />;
  }

  return (
    <>
      {cms.isPreview ? (
        <PreviewView />
      ) : (
        <>
          <EditView />
          <AddPageModal
            show={cms.showAddPageModal}
            onClose={handleCloseAddPageModal}
            label={cms.newPageLabel}
            setLabel={cms.setNewPageLabel}
            path={cms.newPagePath}
            setPath={cms.setNewPagePath}
            error={cms.pageError}
            onConfirm={cms.confirmAddPage}
          />
          <DeletePageModal
            show={cms.showDeletePageModal}
            onClose={handleCloseDeletePageModal}
            pageToDelete={cms.pageToDelete}
            error={cms.deleteError}
            onConfirm={cms.confirmDeletePage}
          />
        </>
      )}
      {/* eslint-disable-next-line react/forbid-component-props */}
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover style={{ zIndex: 99999 }} />
    </>
  );
}

export default function App({ initialPagePath = "/" }) {
  React.useEffect(() => {
    let parentEl = null;
    let originalStyles = {};

    const fixScroll = () => {
      const container = document.querySelector('.cms-module-container');
      if (container && container.parentElement) {
        parentEl = container.parentElement;
        originalStyles = {
          overflow: parentEl.style.overflow,
          padding: parentEl.style.padding,
          margin: parentEl.style.margin
        };
        
        parentEl.style.setProperty('overflow', 'auto', 'important');
        parentEl.style.setProperty('padding', '0', 'important');
        parentEl.style.setProperty('margin', '0', 'important');

        // Reset cuộn để không bị lệch header
        window.scrollTo(0, 0);
        parentEl.scrollTo(0, 0);
      }
      document.documentElement.style.overflow = 'auto';
      document.body.style.overflow = 'auto';
    };

    const t = setTimeout(fixScroll, 500);

    return () => {
      clearTimeout(t);
      if (parentEl) {
        // Trả lại mọi thứ như cũ cho "sạch" dấu vết
        parentEl.style.overflow = originalStyles.overflow || '';
        parentEl.style.padding = originalStyles.padding || '';
        parentEl.style.margin = originalStyles.margin || '';
      }
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [initialPagePath]);

  return (
    <ReduxProvider>
      <AuthProvider>
        <CMSProvider initialPagePath={initialPagePath}>
          <div className="cms-module-container">
            <CMSContent />
          </div>
        </CMSProvider>
      </AuthProvider>
    </ReduxProvider>
  );
}

