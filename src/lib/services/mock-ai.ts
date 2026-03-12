import { AIService } from '@/types/services';

export const mockAi: AIService = {
  async generateLlmsTxt(context) {
    const pageList = context.pages
      .map((p) => `- [${p.title}](${p.url}): ${p.description}`)
      .join('\n');

    return `# ${context.title}

> ${context.description}

${context.title} is accessible at ${context.url}.

## About

${context.description}

## Key Pages

${pageList}

## Contact

For more information, visit ${context.url}.
`;
  },
};
