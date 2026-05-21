import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-4 relative overflow-hidden">
      {/* Decorative background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
      
      <div className="z-10 w-full max-w-md flex flex-col items-center gap-6">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="text-white text-2xl font-black tracking-tighter">F</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
            Free Fitness
          </h1>
          <p className="text-slate-400 text-sm">
            AI-powered fitness & macro tracker.
          </p>
        </div>
        <SignUp
          appearance={{
            elements: {
              card: "bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl",
              headerTitle: "text-slate-100",
              headerSubtitle: "text-slate-400",
              socialButtonsBlockButton: "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200",
              formButtonPrimary: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold transition-all duration-200 border-none shadow-md shadow-emerald-500/10",
              formFieldLabel: "text-slate-300 font-medium",
              formFieldInput: "bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-500 focus:ring-emerald-500",
              footerActionText: "text-slate-400",
              footerActionLink: "text-emerald-400 hover:text-emerald-300 font-semibold",
              dividerLine: "bg-slate-800",
              dividerText: "text-slate-500",
            }
          }}
        />
      </div>
    </div>
  );
}
