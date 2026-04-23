import metadataJson from '../../../project-metadata.json';

interface ProjectMetadata {
  productName: string;
  repoName: string;
  orgName: string;
  maintainer: string;
  description: string;
  urls: {
    repository: string;
    issues: string;
    homepage: string;
    security: string;
    docsThreatModel: string;
    docsHeuristics: string;
    docsPrivacy: string;
    docsFalsePositives: string;
    docsStoreSubmission: string;
  };
}

export const metadata = metadataJson as ProjectMetadata;
