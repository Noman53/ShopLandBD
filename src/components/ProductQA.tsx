import React, { useState } from 'react';
import { HelpCircle, Send, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProductQuestions, useSubmitQuestion } from '@/hooks/useProductQuestions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import UserAvatar from './UserAvatar';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/formatters';
import { Link } from 'react-router-dom';

interface ProductQAProps {
  productId: string;
}

export default function ProductQA({ productId }: ProductQAProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: questions, isLoading } = useProductQuestions(productId);
  const submitQuestion = useSubmitQuestion();
  const [question, setQuestion] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      toast({ title: t('প্রশ্ন লিখুন', 'Please write a question'), variant: 'destructive' });
      return;
    }
    if (question.trim().length < 10) {
      toast({ title: t('প্রশ্ন কমপক্ষে ১০ অক্ষর হতে হবে', 'Question must be at least 10 characters'), variant: 'destructive' });
      return;
    }

    try {
      await submitQuestion.mutateAsync({ productId, question });
      toast({ title: t('প্রশ্ন জমা হয়েছে', 'Question submitted') });
      setQuestion('');
      setShowForm(false);
    } catch (error: any) {
      toast({ title: t('ত্রুটি হয়েছে', 'Error'), description: error.message, variant: 'destructive' });
    }
  };

  const visibleQuestions = questions || [];
  const displayedQuestions = showAll ? visibleQuestions : visibleQuestions.slice(0, 3);

  return (
    <div className="border-t border-border pt-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <HelpCircle className="w-5 h-5" />
          {t('প্রশ্ন ও উত্তর', 'Questions & Answers')}
          {visibleQuestions.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({visibleQuestions.length})
            </span>
          )}
        </h3>
      </div>

      {/* Ask Question */}
      {user ? (
        <div className="mb-6">
          {!showForm ? (
            <Button variant="outline" onClick={() => setShowForm(true)} className="w-full">
              <MessageCircle className="w-4 h-4 mr-2" />
              {t('প্রশ্ন করুন', 'Ask a Question')}
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 bg-secondary/30 rounded-xl space-y-3">
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t('এই পণ্য সম্পর্কে আপনার প্রশ্ন লিখুন...', 'Write your question about this product...')}
                rows={3}
                maxLength={500}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{question.length}/500</span>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setShowForm(false); setQuestion(''); }}>
                    {t('বাতিল', 'Cancel')}
                  </Button>
                  <Button type="submit" disabled={submitQuestion.isPending} size="sm">
                    <Send className="w-4 h-4 mr-2" />
                    {submitQuestion.isPending ? t('জমা হচ্ছে...', 'Submitting...') : t('জমা দিন', 'Submit')}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="mb-6 p-4 bg-secondary/30 rounded-xl text-center">
          <p className="text-sm text-muted-foreground mb-2">
            {t('প্রশ্ন করতে লগইন করুন', 'Login to ask a question')}
          </p>
          <Link to="/login">
            <Button variant="outline" size="sm">{t('লগইন', 'Login')}</Button>
          </Link>
        </div>
      )}

      {/* Questions List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : displayedQuestions.length > 0 ? (
        <div className="space-y-4">
          {displayedQuestions.map((q) => (
            <div key={q.id} className="p-4 bg-card border border-border/50 rounded-xl">
              <div className="flex items-start gap-3">
                <UserAvatar
                  name={q.profiles?.name || null}
                  avatarUrl={q.profiles?.avatar_url || null}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">
                      {q.profiles?.name || t('ব্যবহারকারী', 'User')}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(q.created_at, language)}
                    </span>
                  </div>
                  <p className="text-sm mt-1 font-medium text-primary">
                    <span className="mr-1">Q:</span> {q.question}
                  </p>
                  {q.answer ? (
                    <div className="mt-2 pl-4 border-l-2 border-primary/30">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground mr-1">A:</span> {q.answer}
                      </p>
                      {q.answered_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('উত্তর দেওয়া হয়েছে', 'Answered')} {formatDate(q.answered_at, language)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      {t('উত্তরের অপেক্ষায়...', 'Awaiting answer...')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {visibleQuestions.length > 3 && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  {t('কম দেখুন', 'Show Less')}
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  {t(`আরও ${visibleQuestions.length - 3}টি দেখুন`, `Show ${visibleQuestions.length - 3} More`)}
                </>
              )}
            </Button>
          )}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-4">
          {t('এখনো কোনো প্রশ্ন নেই', 'No questions yet')}
        </p>
      )}
    </div>
  );
}
