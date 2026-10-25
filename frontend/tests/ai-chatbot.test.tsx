import { describe, it, expect } from 'vitest';
import { recognizeIntent } from '../src/components/notion/NotionAIModal';

describe('Sloth AI Chatbot Intent Recognition', () => {
  it('recognizes action-items intent for checklists, tasks, and todos', () => {
    expect(recognizeIntent('Extract all action items from this meeting').task).toBe('action-items');
    expect(recognizeIntent('What are the todos?').task).toBe('action-items');
    expect(recognizeIntent('Create a checklist of tasks').task).toBe('action-items');
  });

  it('recognizes summary intent for summaries and tldr', () => {
    expect(recognizeIntent('Please summarize this document').task).toBe('summarize');
    expect(recognizeIntent('Give me a quick tl;dr overview').task).toBe('summarize');
    expect(recognizeIntent('Brief recap of notes').task).toBe('summarize');
  });

  it('recognizes grammar fix intent for typos and spelling', () => {
    expect(recognizeIntent('Fix grammar and spelling mistakes').task).toBe('fix-grammar');
    expect(recognizeIntent('Proofread and fix typos').task).toBe('fix-grammar');
  });

  it('recognizes make-shorter and make-longer conciseness intents', () => {
    expect(recognizeIntent('Make this much shorter and concise').task).toBe('make-shorter');
    expect(recognizeIntent('Condense this paragraph').task).toBe('make-shorter');
    expect(recognizeIntent('Expand this with more details and make longer').task).toBe('make-longer');
  });

  it('recognizes translation intent with target language extraction', () => {
    const resSpanish = recognizeIntent('Translate to Spanish');
    expect(resSpanish.task).toBe('translate');
    expect(resSpanish.target_language).toBe('Spanish');

    const resGerman = recognizeIntent('Please translate this in German');
    expect(resGerman.task).toBe('translate');
    expect(resGerman.target_language).toBe('German');

    const resFrench = recognizeIntent('Translate into French please');
    expect(resFrench.task).toBe('translate');
    expect(resFrench.target_language).toBe('French');
  });

  it('recognizes tone shift intent', () => {
    const resProf = recognizeIntent('Rewrite in a professional tone');
    expect(resProf.task).toBe('change-tone');
    expect(resProf.tone).toBe('professional');

    const resCasual = recognizeIntent('Make it sound casual');
    expect(resCasual.task).toBe('change-tone');
    expect(resCasual.tone).toBe('casual');
  });

  it('recognizes drafting templates for brainstorm, blog, prd, agenda, and email', () => {
    const resBrainstorm = recognizeIntent('Brainstorm 5 ideas for product launch');
    expect(resBrainstorm.task).toBe('draft');
    expect(resBrainstorm.template_type).toBe('brainstorm');

    const resBlog = recognizeIntent('Write a blog post about offline AI');
    expect(resBlog.task).toBe('draft');
    expect(resBlog.template_type).toBe('blog-post');

    const resPRD = recognizeIntent('Draft a PRD for file management');
    expect(resPRD.task).toBe('draft');
    expect(resPRD.template_type).toBe('prd');

    const resAgenda = recognizeIntent('Create a meeting agenda for tomorrow sync');
    expect(resAgenda.task).toBe('draft');
    expect(resAgenda.template_type).toBe('meeting-agenda');

    const resEmail = recognizeIntent('Draft an email to the client');
    expect(resEmail.task).toBe('draft');
    expect(resEmail.template_type).toBe('email');
  });

  it('recognizes selection context and falls back cleanly for general conversational questions', () => {
    const resGeneral = recognizeIntent('What is quantum computing?');
    expect(resGeneral.task).toBe('chat');
    expect(resGeneral.prompt).toBe('What is quantum computing?');

    const resEdit = recognizeIntent('Make it punchier', 'Selected paragraph text');
    expect(resEdit.task).toBe('edit');
  });

  it('recognizes casual greetings and returns chat intent without triggering drafting', () => {
    expect(recognizeIntent('hey').task).toBe('chat');
    expect(recognizeIntent('hi!').task).toBe('chat');
    expect(recognizeIntent('hello there').task).toBe('chat');
    expect(recognizeIntent('how are you doing today?').task).toBe('chat');
    expect(recognizeIntent('who are you').task).toBe('chat');
  });

  it('keeps ambiguous single topic keywords in chat intent to reconfirm instead of drafting', () => {
    expect(recognizeIntent('blockchain').task).toBe('chat');
    expect(recognizeIntent('space exploration').task).toBe('chat');
  });

  it('recognizes explicit drafting commands for general topics', () => {
    const resGuide = recognizeIntent('Write a guide on database indexing');
    expect(resGuide.task).toBe('draft');
    expect(resGuide.badge).toContain('Draft');
  });

  it('recognizes continue and keep going intents', () => {
    expect(recognizeIntent('continue').task).toBe('continue');
    expect(recognizeIntent('continue writing').task).toBe('continue');
    expect(recognizeIntent('keep going').task).toBe('continue');
    expect(recognizeIntent('proceed').task).toBe('continue');
  });
});
