import React, { useState } from 'react';
import { HelpCircle, MessageCircle, Eye, EyeOff, Trash2, Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAdminQuestions, useAnswerQuestion, useToggleQuestionVisibility, useDeleteQuestion } from '@/hooks/useProductQuestions';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export default function AdminQA() {
  const { t, language } = useLanguage();
  const { data: questions, isLoading } = useAdminQuestions();
  const answerQuestion = useAnswerQuestion();
  const toggleVisibility = useToggleQuestionVisibility();
  const deleteQuestion = useDeleteQuestion();

  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unanswered' | 'answered'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredQuestions = (questions || []).filter(q => {
    if (filterStatus === 'unanswered' && q.answer) return false;
    if (filterStatus === 'answered' && !q.answer) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return q.question.toLowerCase().includes(query) ||
        q.products?.name_en?.toLowerCase().includes(query) ||
        q.products?.name_bn?.toLowerCase().includes(query);
    }
    return true;
  });

  const handleAnswer = async (questionId: string) => {
    if (!answerText.trim()) {
      toast.error(t('উত্তর লিখুন', 'Please write an answer'));
      return;
    }
    try {
      await answerQuestion.mutateAsync({ questionId, answer: answerText });
      toast.success(t('উত্তর সেভ হয়েছে', 'Answer saved'));
      setAnsweringId(null);
      setAnswerText('');
    } catch {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const handleToggleVisibility = async (questionId: string, currentVisibility: boolean) => {
    try {
      await toggleVisibility.mutateAsync({ questionId, isVisible: !currentVisibility });
      toast.success(t('আপডেট হয়েছে', 'Updated'));
    } catch {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteQuestion.mutateAsync(deleteId);
      toast.success(t('ডিলিট হয়েছে', 'Deleted'));
      setDeleteId(null);
    } catch {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const unansweredCount = questions?.filter(q => !q.answer).length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <HelpCircle className="w-7 h-7" />
            {t('প্রশ্ন ও উত্তর', 'Q&A')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('গ্রাহকদের প্রশ্নের উত্তর দিন', 'Answer customer questions')}
            {unansweredCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                {unansweredCount} {t('অনুত্তরিত', 'unanswered')}
              </span>
            )}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder={t('প্রশ্ন বা পণ্য খুঁজুন...', 'Search question or product...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:max-w-xs"
          />
          <div className="flex gap-2">
            {(['all', 'unanswered', 'answered'] as const).map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(status)}
              >
                {status === 'all' ? t('সব', 'All') : status === 'unanswered' ? t('অনুত্তরিত', 'Unanswered') : t('উত্তরিত', 'Answered')}
              </Button>
            ))}
          </div>
        </div>

        {/* Questions List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{t('কোনো প্রশ্ন নেই', 'No questions found')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((q) => (
              <div
                key={q.id}
                className={cn(
                  "bg-card border rounded-xl p-4",
                  !q.answer && "border-amber-300/50 bg-amber-50/5"
                )}
              >
                {/* Product name */}
                <p className="text-xs text-muted-foreground mb-2">
                  {t('পণ্য', 'Product')}: <span className="font-medium text-foreground">{language === 'bn' ? q.products?.name_bn : q.products?.name_en}</span>
                </p>

                {/* Question */}
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {q.profiles?.name || t('ব্যবহারকারী', 'User')}
                      </p>
                      <span className="text-xs text-muted-foreground">{formatDate(q.created_at, language)}</span>
                    </div>
                    <p className="text-sm mt-1">
                      <span className="font-medium text-primary">Q:</span> {q.question}
                    </p>
                  </div>
                </div>

                {/* Answer */}
                {q.answer && answeringId !== q.id && (
                  <div className="mt-3 pl-4 border-l-2 border-primary/30">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">A:</span> {q.answer}
                    </p>
                  </div>
                )}

                {/* Answer Form */}
                {answeringId === q.id && (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder={t('উত্তর লিখুন...', 'Write your answer...')}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleAnswer(q.id)} disabled={answerQuestion.isPending}>
                        <Send className="w-4 h-4 mr-2" />
                        {t('সেভ', 'Save')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setAnsweringId(null); setAnswerText(''); }}>
                        {t('বাতিল', 'Cancel')}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 flex items-center gap-2 pt-2 border-t border-border/50">
                  {answeringId !== q.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAnsweringId(q.id);
                        setAnswerText(q.answer || '');
                      }}
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1" />
                      {q.answer ? t('সম্পাদনা', 'Edit') : t('উত্তর দিন', 'Answer')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleVisibility(q.id, q.is_visible)}
                  >
                    {q.is_visible ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                    {q.is_visible ? t('লুকান', 'Hide') : t('দেখান', 'Show')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(q.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    {t('ডিলিট', 'Delete')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('প্রশ্ন ডিলিট করবেন?', 'Delete this question?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('এটি স্থায়ীভাবে মুছে যাবে।', 'This will be permanently deleted.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('বাতিল', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('ডিলিট', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
