import { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { getCorsHeaders } from '../lib/cors';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
  const jobId = event.pathParameters?.id;
  const refinementId = event.pathParameters?.refinement_id;

  if (!jobId || !refinementId) {
    return {
      statusCode: 400,
      headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'missing_path_parameters', message: 'Required path parameters are missing.' }),
    };
  }

  const refinement = await prisma.refinement.findUnique({ where: { id: refinementId } });

  if (!refinement) {
    return {
      statusCode: 404,
      headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'refinement_not_found', message: 'The requested refinement does not exist.' }),
    };
  }

  if (refinement.jobId !== jobId) {
    return {
      statusCode: 403,
      headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'refinement_job_mismatch', message: 'This refinement does not belong to the specified job.' }),
    };
  }

  await prisma.$transaction([
    prisma.refinement.update({ where: { id: refinementId }, data: { accepted: true } }),
    prisma.job.update({ where: { id: jobId }, data: { output: refinement.afterText } }),
  ]);

  return {
    statusCode: 200,
    headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
  } catch (err) {
    console.error('refine-accept error', err);
    return { statusCode: 500, headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'internal_server_error', message: 'An unexpected error occurred.' }) };
  }
};
