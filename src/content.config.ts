import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/blog',
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tag: z.string(),
    tagColor: z.enum(['red', 'green', 'orange', 'blue', 'gray']),
    calculatorLink: z.string(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
