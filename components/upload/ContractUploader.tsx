import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileText, Upload, X, CheckCircle, File } from 'lucide-react';

interface Props {
    onUpload: (file: File, language: 'en' | 'hi') => void;
}

export default function ContractUploader({ onUpload }: Props) {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [language, setLanguage] = useState<'en' | 'hi'>('en');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleSubmit = () => {
        if (selectedFile) {
            onUpload(selectedFile, language);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="space-y-6 w-full max-w-md mx-auto">
            {/* Language Toggle */}
            <div className="flex justify-center">
                <div className="inline-flex bg-muted p-1 rounded-xl border border-border/50">
                    <button
                        onClick={() => setLanguage('en')}
                        className={cn(
                            "px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                            language === 'en'
                                ? "bg-white text-primary shadow-sm ring-1 ring-black/5"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        English
                    </button>
                    <button
                        onClick={() => setLanguage('hi')}
                        className={cn(
                            "px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                            language === 'hi'
                                ? "bg-white text-primary shadow-sm ring-1 ring-black/5"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        हिंदी
                    </button>
                </div>
            </div>

            {/* Upload Area */}
            <div
                className={cn(
                    "relative group rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden",
                    dragActive
                        ? "border-primary bg-primary/5 scale-[1.02]"
                        : selectedFile
                            ? "border-green-500/50 bg-green-50/50"
                            : "border-border hover:border-primary/50 hover:bg-muted/30"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !selectedFile && inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                    onChange={handleChange}
                />

                <div className="p-6 md:p-10 flex flex-col items-center justify-center min-h-[220px] md:min-h-[280px]">
                    {selectedFile ? (
                        <div className="text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
                            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center relative">
                                <FileText className="w-8 h-8 text-green-600" />
                                <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                    <CheckCircle className="w-5 h-5 text-green-600 fill-green-100" />
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-foreground text-lg truncate max-w-[250px] mx-auto">
                                    {selectedFile.name}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1 font-medium">
                                    {formatFileSize(selectedFile.size)}
                                </p>
                            </div>
                            <div className="flex gap-3 justify-center pt-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                    variant="outline"
                                    onClick={() => setSelectedFile(null)}
                                    className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                                >
                                    Remove
                                </Button>
                                <Button onClick={handleSubmit} className="gap-2">
                                    Analyze Contract
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center space-y-5">
                            <div className="w-20 h-20 mx-auto rounded-2xl bg-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <Upload className="w-10 h-10 text-primary" strokeWidth={1.5} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-lg font-semibold text-foreground">
                                    Click or drag file to upload
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    PDF, DOCX, TXT (Max 10MB)
                                </p>
                            </div>
                            <div className="flex gap-4 justify-center pt-2 opacity-60">
                                <File className="w-6 h-6 text-muted-foreground" />
                                <FileText className="w-6 h-6 text-muted-foreground" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
