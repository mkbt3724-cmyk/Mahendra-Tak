/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, Send, CheckCircle, Shield } from 'lucide-react';
import { submitContactMessage } from '../lib/dbHelper';

interface ContactProps {
  onShowNotification: (title: string, msg: string, type: 'success' | 'info') => void;
}

export default function Contact({ onShowNotification }: ContactProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Feedback');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;

    setSubmitting(true);
    try {
      await submitContactMessage({
        name,
        email,
        subject,
        message,
        type: subject.toLowerCase() === 'bug report' ? 'bug_report' : 'feedback',
      });

      setSubmitted(true);
      onShowNotification('Message Transmitted! 🚀', 'Your diagnostic bulletin was saved into admin inbox boards.', 'success');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col min-h-screen text-white font-sans bg-black p-6">
      <div className="max-w-2xl mx-auto w-full text-left">
        {/* Header */}
        <header className="relative w-full rounded-2xl overflow-hidden bg-zinc-950 p-8 border border-zinc-900 flex flex-col items-start mb-10">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/5 to-transparent pointer-events-none" />
          <h1 className="text-3xl font-black tracking-tight leading-none flex items-center gap-2">
            <Mail className="text-blue-500 w-8 h-8" />
            CORE TRANSMISSION LINE
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1 uppercase">Submit diagnostics bulletins, bug tickets, or system suggestions</p>
        </header>

        {submitted ? (
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 text-center font-mono text-xs">
            <CheckCircle className="text-emerald-500 w-16 h-16 mx-auto mb-4 animate-bounce" />
            <h3 className="text-lg font-black text-white uppercase mb-2">TELEMETRY SECURED</h3>
            <p className="text-zinc-500 max-w-sm mx-auto leading-relaxed">
              Your support ticket has been encrypted and recorded successfully. Administrative pilots will parse your submission shortly.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setName('');
                setEmail('');
                setMessage('');
              }}
              className="mt-6 px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl transition border border-zinc-850"
            >
              Send New Transmission
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8 flex flex-col gap-5 text-left font-mono text-xs">
            <h2 className="text-sm font-bold tracking-widest text-zinc-400 uppercase border-b border-zinc-900 pb-3 mb-2">
              DIAGNOSTICS BOARD
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 uppercase font-bold">Pilot Identity / Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter name..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-900 border border-zinc-850 focus:border-blue-500 focus:outline-none px-4 py-2.5 text-xs rounded-xl text-zinc-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 uppercase font-bold">Pilot Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="Enter email..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-900 border border-zinc-850 focus:border-blue-500 focus:outline-none px-4 py-2.5 text-xs rounded-xl text-zinc-200"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-zinc-500 uppercase font-bold">Transmission Category</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-zinc-900 border border-zinc-850 focus:border-blue-500 focus:outline-none p-2.5 rounded-xl text-zinc-300 cursor-pointer"
              >
                <option value="Feedback">Suggestions / Feedback</option>
                <option value="Bug Report">Malware / Bug Report</option>
                <option value="Support">System Support Request</option>
                <option value="Partnership">Business Partnership</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-zinc-555 uppercase font-bold">Operational Message Body</label>
              <textarea
                rows={4}
                required
                placeholder="Type your message payload..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-zinc-900 border border-zinc-850 focus:border-blue-500 focus:outline-none p-3 text-xs rounded-xl text-zinc-200 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2.5 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl tracking-wider uppercase transition flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer"
            >
              <Send size={13} />
              <span>TRANSMIT BULLETINS</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
