import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Comprehensive Error Logging (Audit Point 5)
    console.error("Critical UI Error Captured:", {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href
    });
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="min-h-[300px] flex items-center justify-center bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-rose-200 animate-in fade-in zoom-in-95 duration-300">
          <div className="text-center max-w-md">
            <div className="inline-flex p-4 bg-rose-100 rounded-full mb-6 shadow-sm border border-rose-200">
              <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">Modul Gagal Dimuat</h2>
            <p className="text-slate-500 text-sm mb-6">
              Terjadi kesalahan fatal saat merender komponen ini. {this.props.moduleName ? `Modul ${this.props.moduleName} terganggu.` : 'Pipeline audit mungkin terganggu.'}
            </p>
            
            <div className="bg-white p-4 rounded-xl text-[10px] font-mono overflow-auto max-h-32 mb-8 border border-slate-200 text-left shadow-inner">
              <p className="font-bold text-rose-600 mb-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                {this.state.error?.toString()}
              </p>
              <pre className="text-slate-400 whitespace-pre-wrap leading-relaxed">
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                Coba Lagi
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reload Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
