import { useState, useEffect } from 'react';
import {
  Play,
  FileSearch,
  Network,
  Brain,
  Target,
  MapPin,
  Bell,
  FileText,
  CheckCircle2,
  ArrowRight,
  X,
} from 'lucide-react';
import { cases } from '@/data/mockData';
import { predictCashOut } from '@/services/predictionEngine';
import { formatCurrency, formatDateTime, riskColors, timeUntil } from '@/utils/helpers';
import type { ViewName } from './Layout';
import type { Prediction } from '@/types';

interface DemoRunnerProps {
  onClose: () => void;
  onComplete: (view: ViewName, caseId: string, prediction?: Prediction) => void;
}

const steps = [
  { id: 0, label: 'Complaint Filed', icon: FileSearch, view: 'cases' as ViewName },
  { id: 1, label: 'Money Trail Analysis', icon: Network, view: 'money-trail' as ViewName },
  { id: 2, label: 'AI Risk Analysis', icon: Brain, view: 'xai' as ViewName },
  { id: 3, label: 'Top 5 Predictions', icon: Target, view: 'predictions' as ViewName },
  { id: 4, label: 'GIS Map', icon: MapPin, view: 'map' as ViewName },
  { id: 5, label: 'Alert Generated', icon: Bell, view: 'alerts' as ViewName },
  { id: 6, label: 'Report Ready', icon: FileText, view: 'reports' as ViewName },
];

export default function DemoRunner({ onClose, onComplete }: DemoRunnerProps) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const demoCase = cases.find((c) => c.id === 'CASE-001')!;
  const predictions = predictCashOut(demoCase);

  const startDemo = () => {
    setIsRunning(true);
    setCurrentStep(0);
  };

  useEffect(() => {
    if (!isRunning || currentStep < 0) return;
    if (currentStep >= steps.length) {
      setIsComplete(true);
      setIsRunning(false);
      return;
    }
    const timer = setTimeout(() => {
      setCurrentStep((s) => s + 1);
    }, 1800);
    return () => clearTimeout(timer);
  }, [isRunning, currentStep]);

  const goToStep = (stepIndex: number) => {
    const step = steps[stepIndex];
    onComplete(step.view, demoCase.id, predictions[0]);
  };

  const rc = riskColors[demoCase.riskLevel];

  return (
    <div className="fixed inset-0 z-[100] bg-navy-950/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl card p-6 lg:p-8 relative my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-800/50 mb-3 glow-cyan">
            <Play className="w-6 h-6 text-cyan-400 fill-cyan-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Demo Case Runner</h2>
          <p className="text-xs text-slate-500 mt-1">Complete end-to-end flow: Complaint → Money Trail → AI Prediction → Map → Alert → Report</p>
        </div>

        {/* Case summary */}
        <div className={`p-4 rounded-xl border ${rc.border} ${rc.bg} mb-6`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${rc.dot} pulse-dot`} />
                <span className="text-sm font-bold text-white">{demoCase.id}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded uppercase ${rc.bg} ${rc.text} border ${rc.border}`}>{demoCase.riskLevel}</span>
              </div>
              <p className="text-xs text-slate-400">{demoCase.fraudType} · {demoCase.originLocation}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-cyan-400">{formatCurrency(demoCase.amount)}</p>
              <p className="text-[10px] text-slate-500">Risk Score: {demoCase.riskScore}</p>
            </div>
          </div>
        </div>

        {/* Steps timeline */}
        <div className="space-y-2 mb-6">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isDone = currentStep > i || isComplete;
            const isActive = currentStep === i;
            const isPending = currentStep < i && !isComplete;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  isActive
                    ? 'bg-cyan-950/20 border-cyan-800/40 slide-in-right'
                    : isDone
                    ? 'bg-navy-800/50 border-navy-600'
                    : 'bg-navy-950 border-navy-700 opacity-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  isDone ? 'bg-green-950/40 border border-green-800/40' :
                  isActive ? 'bg-cyan-950/40 border border-cyan-800/40 glow-cyan' :
                  'bg-navy-800 border border-navy-700'
                }`}>
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${isDone || isActive ? 'text-white' : 'text-slate-500'}`}>
                    {step.label}
                  </p>
                  {isActive && (
                    <p className="text-[10px] text-cyan-400 mt-0.5 fade-in">Processing...</p>
                  )}
                  {isDone && i === 0 && (
                    <p className="text-[10px] text-slate-500">{demoCase.complaintId} — {formatDateTime(demoCase.complaintTime)}</p>
                  )}
                  {isDone && i === 1 && (
                    <p className="text-[10px] text-slate-500">{demoCase.transactionLayers} layers traced through mule accounts</p>
                  )}
                  {isDone && i === 2 && (
                    <p className="text-[10px] text-slate-500">Risk score {demoCase.riskScore} — {demoCase.riskLevel}</p>
                  )}
                  {isDone && i === 3 && (
                    <p className="text-[10px] text-slate-500">Top: {predictions[0].label} — {predictions[0].probability}%</p>
                  )}
                  {isDone && i === 4 && (
                    <p className="text-[10px] text-slate-500">Cash-out {timeUntil(predictions[0].expectedTime)} at {predictions[0].district}</p>
                  )}
                  {isDone && i === 5 && (
                    <p className="text-[10px] text-slate-500">Critical alert dispatched to field units</p>
                  )}
                  {isDone && i === 6 && (
                    <p className="text-[10px] text-slate-500">Full investigation report generated</p>
                  )}
                </div>
                {isDone && (
                  <button
                    onClick={() => goToStep(i)}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                  >
                    View <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-3">
          {!isRunning && !isComplete && (
            <button
              onClick={startDemo}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-medium transition-all"
            >
              <Play className="w-4 h-4 fill-white" /> Start Demo
            </button>
          )}
          {isComplete && (
            <>
              <button
                onClick={() => goToStep(3)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-600 text-sm text-slate-200 transition-colors"
              >
                <Target className="w-4 h-4" /> View Predictions
              </button>
              <button
                onClick={() => goToStep(6)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-medium transition-all"
              >
                <FileText className="w-4 h-4" /> View Report
              </button>
            </>
          )}
          {isRunning && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 pulse-dot" />
              Running analysis pipeline...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
