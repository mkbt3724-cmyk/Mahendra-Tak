/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar, User, ArrowLeft, Send, Sparkles } from 'lucide-react';
import { BlogPost, BlogComment, UserProfile } from '../types';
import { getBlogById, getBlogComments, submitBlogComment } from '../lib/dbHelper';

interface BlogArticleProps {
  blogId: string;
  user: UserProfile | null;
  onNavigate: (page: string, params?: Record<string, any>) => void;
  onTriggerLogin: () => void;
  onShowNotification: (title: string, msg: string, type: 'success' | 'info') => void;
}

export default function BlogArticle({
  blogId,
  user,
  onNavigate,
  onTriggerLogin,
  onShowNotification,
}: BlogArticleProps) {
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const post = await getBlogById(blogId);
    if (!post) {
      onNavigate('blog');
      return;
    }
    setBlog(post);

    const comms = await getBlogComments(blogId);
    setComments(comms);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [blogId]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onTriggerLogin();
      return;
    }
    if (!commentText.trim()) return;

    setSubmitting(true);
    try {
      await submitBlogComment({
        blogId,
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        commentText: commentText.trim(),
      });

      setCommentText('');
      onShowNotification('Comment Posted! 💬', 'Your terminal transmission has been saved under article metadata.', 'success');

      // Reload comments list
      const comms = await getBlogComments(blogId);
      setComments(comms);
    } catch (err) {
      console.error('Comment failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !blog) {
    return (
      <div className="w-full flex-1 flex items-center justify-center bg-black py-24 text-zinc-500 font-mono text-xs">
        <span>DECRYPTING CHANNELS CELL LOGS...</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col min-h-screen text-white font-sans bg-black p-6">
      <div className="max-w-3xl mx-auto w-full text-left">
        {/* Back Link */}
        <button
          onClick={() => onNavigate('blog')}
          className="flex items-center gap-1.5 text-zinc-505 hover:text-white transition font-mono text-xs mb-6 uppercase cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Blog
        </button>

        {/* Article Layout */}
        <article className="bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden p-6 md:p-8 mb-8">
          <img
            src={blog.coverImage}
            alt={blog.title}
            className="w-full aspect-video rounded-2xl object-cover mb-6 border border-zinc-900"
          />

          <div className="flex gap-2.5 items-center font-mono text-[10px] text-zinc-500 uppercase mb-4">
            <span className="px-2 py-0.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 font-bold rounded">
              {blog.category}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
            </span>
            <span className="flex items-center gap-1">
              <User size={11} className="text-blue-500" />
              <span>{blog.authorName}</span>
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-6">{blog.title}</h1>

          {/* Body Content */}
          <div className="text-zinc-300 text-sm md:text-base leading-relaxed font-mono whitespace-pre-wrap flex flex-col gap-4 border-b border-zinc-900 pb-8 mb-8">
            {blog.content}
          </div>

          {/* Comments Module */}
          <div className="w-full">
            <h3 className="text-sm font-bold font-mono tracking-widest text-zinc-400 uppercase mb-4">
              ARTICLE FEEDBACK ({comments.length})
            </h3>

            {/* Comment Form */}
            <form onSubmit={handleCommentSubmit} className="flex gap-2 mb-6 items-start">
              <textarea
                placeholder={user ? "Transmit message..." : "Please log in to leave feedback."}
                disabled={!user}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={1}
                required
                className="flex-1 bg-zinc-900 border border-zinc-850 focus:border-blue-500 focus:outline-none px-4 py-2 text-xs text-zinc-200 placeholder-zinc-650 rounded-xl resize-none font-mono"
              />
              {user && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition active:scale-95 cursor-pointer shrink-0"
                >
                  <Send size={14} />
                </button>
              )}
            </form>

            {/* Comments List */}
            <div className="flex flex-col gap-3">
              {comments.length === 0 ? (
                <div className="text-center py-6 text-[10px] text-zinc-600 font-mono">
                  NO TRANSMITTED COMMENT DATA YET.
                </div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-xl flex gap-3 items-start"
                  >
                    <img
                      src={c.userPhoto}
                      alt={c.userName}
                      className="w-8 h-8 rounded-lg object-cover border border-zinc-850 shrink-0"
                    />
                    <div className="flex-1 min-w-0 font-mono">
                      <div className="flex justify-between items-center text-[10px] text-zinc-500 mb-1">
                        <span className="font-bold text-zinc-350">{c.userName}</span>
                        <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {c.commentText}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
