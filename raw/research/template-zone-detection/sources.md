---
topic: "template zone-detection strategy: how to automatically classify zones of an arbitrary firm demand-letter .docx template as boilerplate-verbatim vs variable-populated, for an LLM document-generation pipeline (LLM classification, multi-letter diff, delimiter markup, docx content controls/SDTs, human annotation UI)"
slug: template-zone-detection
researched: 2026-06-22
---

# Primary Sources — Template Zone-Detection Strategy

| ID | Type | Locator | Accessed | What it contributed |
|----|------|---------|----------|---------------------|
| S1 | context7 | `/open-xml-templating/docxtemplater` — "placeholder tag delimiter syntax for variable substitution and how templates preserve docx formatting" | 2026-06-22 | docxtemplater fills tags inside the docx zip/OOXML, preserving formatting; configurable delimiters (`{}`, `<<>>`, ERB) to avoid collisions; non-tag content is copied verbatim |
| S2 | web | https://assemblyline.suffolklitlab.org/docs/authoring/docx/ | 2026-06-22 | Production legal-tech (Docassemble / Suffolk LIT Lab) uses `{{ field_name }}` fill-ins and `{%p if %}` conditional paragraphs in DOCX (docxtpl/Jinja2); warns to test tightly-formatted docs with short and long values |
| S3 | web | https://learn.microsoft.com/en-us/office/dev/add-ins/word/create-better-add-ins-for-word-with-office-open-xml | 2026-06-22 | OOXML is the native .docx format so any content/formatting can be expressed; `<w:sdt>` content controls with `showingPlcHdr` placeholder; SDTs are the native variable-region mechanism |
| S4 | web | https://docs.aspose.com/words/net/working-with-content-control-sdt/ | 2026-06-22 | SDTs imported as discrete nodes (StructuredDocumentTag); carry alias/tag, placeholder, and can be mapped/bound to custom XML data parts — machine-readable boundaries + data binding |
| S5 | web | https://groupbwt.com/blog/llm-for-web-scraping/ | 2026-06-22 | Pattern of segmenting a document then "first classify the block type, then extract relevant fields"; LLMs label content blocks by meaning, not location; strip boilerplate |
| S6 | web | https://towardsdatascience.com/llm-powered-parsing-and-analysis-of-semi-structured-structured-documents-f03ac92f063e/ | 2026-06-22 | LLM extraction needs explicit field-meaning instructions; output 'N/A' when a field is absent and do not invent — supports grounding-only + gap handling |
| S7 | web | https://link.springer.com/article/10.1007/s10844-005-0861-z | 2026-06-22 | Template induction / wrapper induction: automatically generate extraction templates from multiple example documents (constant vs varying spans) |
| S8 | web | https://arxiv.org/html/2501.06659 | 2026-06-22 | TWIX: infers a visual template from repeated documents using phrase-location patterns rather than fragile bounding boxes; up to 58 fields/record makes manual spec error-prone |
| S9 | web | https://www.hyperscience.ai/blog/llm-first-document-workflows-whats-real-vs-hype/ | 2026-06-22 | LLMs should be "strategic accelerators within a broader IDP pipeline," not the center; precision field capture still needs specialized ML — argues against unsupervised LLM as final authority |
| S10 | web | https://arxiv.org/html/2312.07182v1 | 2026-06-22 | Peer-reviewed: general LLMs are a good fit for classification but do not yet match bespoke models for rigid extraction/NER; purely-LLM architecture not yet feasible for all NLP tasks |

## Excerpts

### S1 — Docxtemplater custom delimiters & formatting preservation
https://context7.com/open-xml-templating/docxtemplater
> "Customize the start and end delimiters (defaulting to '{' and '}') to prevent conflicts with your template's content." Docxtemplater loads the docx via PizZip (the OOXML zip) and "replaces placeholder tags within templates with provided data" — formatting outside the tags is untouched.

### S2 — Document Assembly Line, working with DOCX
https://assemblyline.suffolklitlab.org/docs/authoring/docx/
> "Fill in the blank fields, which are simply surrounded with double curly brackets: {{ field_name }} Conditional text with {% if some_condition %} and {% endif %}, or the slight variation {%p if some_condition %} ... {%p endif %} to make a whole paragraph conditional."
> "When working with documents that are tightly formatted, it's important to test with both short and long amounts of text and with different numbers of repeated fields."

### S3 — Microsoft Learn, OOXML in Word
https://learn.microsoft.com/en-us/office/dev/add-ins/word/create-better-add-ins-for-word-with-office-open-xml
> "The showingPlcHdr attribute is an optional setting that sets the default content you include inside the control (text in this example) as placeholder content."
> "Office Open XML is the native file format for Word documents (.docx), which means you can insert virtually any content type with the exact formatting users can apply manually."

### S4 — Aspose.Words, content control SDT
https://docs.aspose.com/words/net/working-with-content-control-sdt/
> "A Structured Document Tag or content control from any document loaded into Aspose.Words is imported as a StructuredDocumentTag node."
> "You can bind content controls with XML data (custom XML part) in Word documents."

### S5 — LLM web scraping (block-classify then extract)
https://groupbwt.com/blog/llm-for-web-scraping/
> "Use prompt chaining to first classify the block type, then extract relevant fields."
> "Unlike XPath or CSS-based extraction, LLMs identify the meaning of each content block, not just its location."

### S6 — Towards Data Science, LLM-powered parsing
https://towardsdatascience.com/llm-powered-parsing-and-analysis-of-semi-structured-structured-documents-f03ac92f063e/
> "If the information of a required field is not available, output 'N/A' for it. ... not inventing any information if not available."

### S7 — Springer, Post-Supervised Template Induction
https://link.springer.com/article/10.1007/s10844-005-0861-z
> "it is desirable to automatically generate template extraction programs from examples of lists and tables in html documents." (References Kushmerick, "Wrapper Induction for Information Extraction.")

### S8 — TWIX, Visual Template Inference
https://arxiv.org/html/2501.06659
> "TWIX uses phrase locations based on OCR extraction order to more reliably capture consistent field patterns ... our datasets contain up to 58 fields per record, making manual specification time-consuming and error-prone."

### S9 — Hyperscience, LLM-First Document Workflows
https://www.hyperscience.ai/blog/llm-first-document-workflows-whats-real-vs-hype/
> "Rather than being the center of gravity, LLMs should be thought of as strategic accelerators within a broader IDP pipeline."

### S10 — arXiv, Classifying complex documents
https://arxiv.org/html/2312.07182v1
> "while the classification task is a naturally good fit with a generative text models ... that is not true for highly-constrained NLP tasks such as extracting rigidly defined information from unstructured texts."
> "As a general strategy, a purely LLM-based architecture is not yet feasible for all NLP tasks, especially for complex processing chains."
