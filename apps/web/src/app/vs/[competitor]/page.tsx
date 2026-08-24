import CompetitorComparisonPage, {
  generateStaticParams as baseGenerateStaticParams,
  generateMetadata as baseGenerateMetadata,
} from '../../alternatives/[competitor]/page';

export const dynamicParams = true;

export function generateStaticParams() {
  return baseGenerateStaticParams();
}

export function generateMetadata({ params }: { params: Promise<{ competitor: string }> }) {
  return baseGenerateMetadata({ params });
}

export default CompetitorComparisonPage;
