import React, { useEffect, useRef } from "react";

interface LivePreviewProps {
  code: string;
}

export function LivePreview({ code }: LivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage(code, "*");
    }
  }, [code]);

  return (
    <iframe
      ref={iframeRef}
      title="Live Preview"
      sandbox="allow-scripts"
      style={{ width: "100%", height: "400px", border: "1px solid #ccc" }}
      srcDoc={`
        <html>
          <body>
            <div id="root"></div>
            <script>
              window.addEventListener('message', (event) => {
                try {
                  const code = event.data;
                  const transpiledCode = Babel.transform(code, { presets: ['react', 'es2015'] }).code;
                  eval(transpiledCode);
                } catch (error) {
                  document.getElementById('root').innerHTML = '<pre style="color:red;">' + error.message + '</pre>';
                }
              }, false);
            </script>
            <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          </body>
        </html>
      `}
    />
  );
}
