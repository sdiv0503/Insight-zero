"use client";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { BrainCircuit, ShieldCheck, Zap, Presentation, FileText, Database } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500/30">
      
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto border-b border-slate-800">
        <div className="flex items-center gap-2">
            <BrainCircuit className="w-8 h-8 text-indigo-500" />
            <span className="text-xl font-bold tracking-tight text-white">Insight-Zero</span>
        </div>
        <div className="flex gap-4">
            <Button variant="ghost" className="text-slate-300 hover:text-white" asChild>
                <a href="http://localhost:3001/api-docs" target="_blank">API Docs</a>
            </Button>
            <SignInButton mode="modal">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">Sign In / Dashboard</Button>
            </SignInButton>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-24 flex flex-col items-center text-center space-y-8">
        <div className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-sm font-medium text-indigo-300">
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 mr-2 animate-pulse"></span>
          Enterprise FinOps & RAG Update Live
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-500">
          The Autonomous Data Steward for Enterprise.
        </h1>
        
        <p className="text-xl text-slate-400 max-w-2xl leading-relaxed">
          Stop staring at static dashboards. Insight-Zero automatically detects anomalies, redacts PII, and uses Llama-3 AI to reason about your data context.
        </p>

        <SignInButton mode="modal">
            <Button size="lg" className="h-14 px-8 text-lg bg-white text-slate-950 hover:bg-slate-200">
                Launch Platform
            </Button>
        </SignInButton>
      </main>

      {/* Value Proposition Feature Grid */}
      <section className="bg-slate-900 border-t border-slate-800 py-24">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12">
              
              <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                      <ShieldCheck className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Privacy by Design</h3>
                  <p className="text-slate-400">Integrated NLP (Microsoft Presidio) automatically redacts PII before it ever hits the AI, ensuring complete GDPR & SOC2 compliance.</p>
              </div>

              <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                      <BrainCircuit className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Context-Aware AI</h3>
                  <p className="text-slate-400">Don't just see the crash. Upload internal PDFs to our Pinecone Vector DB, and our Llama-3 RAG brain will tell you *why* it happened.</p>
              </div>

              <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <Presentation className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Boardroom Ready</h3>
                  <p className="text-slate-400">Generates autonomous deliverables. Instantly export high-resolution PDF reports and .pptx slides detailing the AI root-cause analysis.</p>
              </div>

          </div>
      </section>

    </div>
  );
}