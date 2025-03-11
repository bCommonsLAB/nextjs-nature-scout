'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import Image from 'next/image';
import type { TestCase, TestResult } from '../types/test-types';

interface TestTableProps {
  testCases: TestCase[];
  results?: TestResult[];
}

export function TestTable({ testCases, results }: TestTableProps) {
  // Gruppiere die Testfälle nach Kategorie und Subkategorie
  const groupedTestCases = testCases.reduce((acc, testCase) => {
    const key = `${testCase.category} → ${testCase.subCategory}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(testCase);
    return acc;
  }, {} as Record<string, TestCase[]>);

  return (
    <div className="space-y-4">
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[400px]">Bilder</TableHead>
              <TableHead>Sample</TableHead>
              <TableHead>Pflanzen</TableHead>
              <TableHead className="w-[150px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedTestCases).map(([groupKey, groupTestCases]) => (
              <>
                <TableRow className="bg-muted/50">
                  <TableCell 
                    colSpan={4} 
                    className="py-2 font-medium"
                  >
                    {groupKey}
                  </TableCell>
                </TableRow>
                {groupTestCases.map((testCase) => {
                  const result = results?.find(r => r.testCaseId === testCase.id);
                  
                  return (
                    <TableRow key={testCase.id}>
                      <TableCell className="p-2">
                        <div className="flex gap-2">
                          {testCase.imageUrls.map((imageUrl, index) => {
                            const imageFileName = imageUrl.split('/').pop() || '';
                            const fileNameWithoutExt = imageFileName.replace(/\.[^/.]+$/, "");
                            return (
                              <TooltipProvider key={index}>
                                <Dialog>
                                  <Tooltip>
                                    <DialogTrigger asChild>
                                      <TooltipTrigger asChild>
                                        <div className="flex flex-col items-center">
                                          <div className="relative w-[160px] h-[107px] cursor-pointer hover:opacity-90 transition-opacity">
                                            <Image
                                              src={imageUrl}
                                              alt={`${testCase.example} Bild ${index + 1}`}
                                              fill
                                              sizes="160px"
                                              className="object-cover rounded-md"
                                              quality={60}
                                            />
                                          </div>
                                          <p className="mt-1 text-[10px] text-muted-foreground truncate w-[160px] text-center">
                                            {fileNameWithoutExt}
                                          </p>
                                        </div>
                                      </TooltipTrigger>
                                    </DialogTrigger>
                                    <TooltipContent>
                                      <p>{imageFileName}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
                                    <div className="flex flex-col h-full">
                                      <DialogTitle className="sr-only">
                                        {testCase.example} Bild {index + 1}: {imageFileName}
                                      </DialogTitle>
                                      <div className="relative w-[95vw] h-[85vh] bg-black/5">
                                        <Image
                                          src={imageUrl}
                                          alt={testCase.description || testCase.subCategory}
                                          fill
                                          sizes="95vw"
                                          className="object-contain p-4"
                                          quality={100}
                                          priority
                                        />
                                      </div>
                                      <div className="bg-background p-6 text-sm text-muted-foreground border-t">
                                        <p className="font-medium">{testCase.example} - Bild {index + 1}</p>
                                        <p className="mt-1">{imageFileName}</p>
                                        <p className="mt-2 text-xs text-muted-foreground/80">
                                          {testCase.category} → {testCase.subCategory}
                                        </p>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </TooltipProvider>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>{testCase.example}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {testCase.plants.map((plant, index) => (
                            <Badge 
                              key={index} 
                              variant="outline" 
                              className="text-xs"
                            >
                              {plant}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {result ? (
                          <Badge 
                            variant={result.success ? "success" : "destructive"}
                            className="w-full justify-center"
                          >
                            {result.success ? (
                              "✓ Korrekt"
                            ) : (
                              <div className="text-xs">
                                <div>✗ Falsch</div>
                                <div className="font-normal">
                                  Erkannt: {result.detectedHabitat}
                                </div>
                              </div>
                            )}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="w-full justify-center">
                            Nicht getestet
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </>
            ))}
            {testCases.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Keine Testfälle verfügbar
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 