
"use client";

import { useState } from "react";
import type { Part, PartOperation, Machine } from "@/lib/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, GripVertical, X, Search } from "lucide-react";
import { Badge } from "../ui/badge";
import { Label } from "@/components/ui/label";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


interface PartsManagerProps {
  parts: Part[];
  setParts: React.Dispatch<React.SetStateAction<Part[]>>;
  machines: Machine[];
  isPlanner?: boolean;
  masterPartsList?: Part[];
  onPartSelectionChange?: (part: Part) => void;
  isAdjustingPlan?: boolean;
}

interface SortablePartItemProps {
  part: Part;
  index: number;
  machines: Machine[];
  isPlanner?: boolean;
  isAdjustingPlan?: boolean;
  handleRemovePart: (partId: string) => void;
  handlePartNameChange: (partId: string, newName: string) => void;
  handlePartDescriptionChange: (partId: string, newDescription: string) => void;
  handleQuantityChange: (partId: string, newQuantity: number) => void;
  handleActualQuantityChange: (partId: string, newQuantity: number) => void;
  handleAddNewOperation: (partId: string) => void;
  handleDeleteOperation: (partId: string, opIndex: number) => void;
  handleOperationValueChange: (partId: string, opIndex: number, field: keyof PartOperation, value: string | number) => void;
  handleOperationSelectionChange: (partId: string, opIndex: number, checked: boolean) => void;
}

function SortablePartItem({ 
    part, 
    index,
    machines,
    isPlanner,
    isAdjustingPlan,
    handleRemovePart,
    handlePartNameChange,
    handlePartDescriptionChange,
    handleQuantityChange,
    handleActualQuantityChange,
    handleAddNewOperation,
    handleDeleteOperation,
    handleOperationValueChange,
    handleOperationSelectionChange,
 }: SortablePartItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({id: part.id, disabled: !isPlanner});

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOperationSelected = (opIndex: number) => {
    if (!part.selectedOperations) return true; // Default to selected if not defined
    const masterOp = part.operations[opIndex];
    return part.selectedOperations.some(op => op.stepName === masterOp.stepName);
  };
  
  // For the Data Entry page, only show unique press types (e.g., "Press-50T", not "Press-50T-2")
  const uniquePressTypes = machines.filter(m => !/-\d+$/.test(m.machineName));

  return (
    <div ref={setNodeRef} style={style}>
        <AccordionItem value={part.id}>
             <div className="flex flex-wrap items-center justify-between px-4 py-2 gap-y-2">
                <AccordionTrigger className="flex-1 hover:no-underline p-0 min-w-[200px]">
                     <div className="flex items-center gap-4 flex-1 min-w-0">
                         {isPlanner && (
                            <div {...attributes} {...listeners} className="cursor-grab p-2 hidden sm:block">
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                            </div>
                         )}
                         {isPlanner ? (
                            <Badge variant="secondary" className="w-10 h-6 flex items-center justify-center shrink-0">{index + 1}</Badge>
                         ) : <div className="w-2"></div>}
                         <div className="flex flex-col text-left min-w-0">
                            <span className="font-semibold text-base truncate">{part.partName}</span>
                            <span className="text-sm text-muted-foreground truncate">{part.partDescription}</span>
                         </div>
                    </div>
                </AccordionTrigger>
                 <div className="flex items-center gap-2 shrink-0 ml-auto pl-4">
                    {isPlanner && (
                        <div className="flex items-center gap-2">
                            {isAdjustingPlan && (
                                <>
                                <Label htmlFor={`actual-quantity-${part.id}`} className="text-muted-foreground sm:inline hidden">Actual Qty:</Label>
                                <Input
                                    id={`actual-quantity-${part.id}`}
                                    type="number"
                                    value={part.actualQuantityProduced || ''}
                                    onChange={(e) => handleActualQuantityChange(part.id, parseInt(e.target.value, 10))}
                                    placeholder="e.g. 150"
                                    className="w-28 h-8"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                </>
                            )}
                            <Label htmlFor={`quantity-${part.id}`} className="text-muted-foreground sm:inline hidden">Target Qty:</Label>
                            <Input
                                id={`quantity-${part.id}`}
                                type="number"
                                value={part.quantityToProduce || ''}
                                onChange={(e) => handleQuantityChange(part.id, parseInt(e.target.value, 10))}
                                placeholder="e.g. 500"
                                required
                                className="w-28 h-8"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    )}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0 hover:bg-destructive/10 group" onClick={(e) => e.stopPropagation()}>
                                {isPlanner ? <X className="h-4 w-4 text-muted-foreground group-hover:text-destructive" /> : <Trash2 className="h-4 w-4 text-muted-foreground group-hover:text-destructive" />}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently remove this part from the {isPlanner ? 'planner' : 'master list'}.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemovePart(part.id)}>Continue</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
            <AccordionContent className="bg-muted/30">
                <div className="px-4 py-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`part-name-${part.id}`}>Part Name</Label>
                        <Input id={`part-name-${part.id}`} value={part.partName || ''} onChange={(e) => handlePartNameChange(part.id, e.target.value)} disabled={isPlanner} />
                      </div>
                      <div>
                        <Label htmlFor={`part-desc-${part.id}`}>Part Number</Label>
                        <Input id={`part-desc-${part.id}`} value={part.partDescription || ''} onChange={(e) => handlePartDescriptionChange(part.id, e.target.value)} disabled={isPlanner} />
                      </div>
                  </div>

                   <div>
                        <h4 className="font-medium mb-2 text-sm">Operations</h4>
                         <div className="rounded-md border bg-background overflow-x-auto">
                            <Table>
                            <TableHeader>
                                <TableRow>
                                {isPlanner && <TableHead className="w-12"></TableHead>}
                                <TableHead>Process</TableHead>
                                <TableHead>Press</TableHead>
                                <TableHead className="hidden md:table-cell">Die Set (min)</TableHead>
                                <TableHead className="hidden md:table-cell">Time/50pcs (min)</TableHead>
                                <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {part.operations.map((op, opIndex) => (
                                <TableRow key={opIndex}>
                                     {isPlanner && (
                                        <TableCell>
                                            <Checkbox
                                                checked={isOperationSelected(opIndex)}
                                                onCheckedChange={(checked) => handleOperationSelectionChange(part.id, opIndex, !!checked)}
                                                aria-label={`Select operation ${op.stepName}`}
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <Input value={op.stepName || ''} onChange={(e) => handleOperationValueChange(part.id, opIndex, 'stepName', e.target.value)} className="h-8 min-w-[150px]" disabled={isPlanner}/>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={op.lowestPress}
                                            onValueChange={(value) => handleOperationValueChange(part.id, opIndex, 'lowestPress', value)}
                                            disabled={isPlanner}
                                        >
                                            <SelectTrigger className="h-8 min-w-[120px] sm:min-w-[150px]">
                                                <SelectValue placeholder="Select press" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {uniquePressTypes.map(m => (
                                                    <SelectItem key={m.id} value={m.machineName}>{m.machineName}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <Input 
                                        type="number"
                                        value={op.dieSettingTime || ''}
                                        onChange={(e) => handleOperationValueChange(part.id, opIndex, 'dieSettingTime', parseInt(e.target.value, 10))}
                                        className="h-8 w-20"
                                        disabled={isPlanner}
                                        />
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <Input
                                        type="number"
                                        value={op.timeFor50Pcs || ''}
                                        onChange={(e) => handleOperationValueChange(part.id, opIndex, 'timeFor50Pcs', parseInt(e.target.value, 10))}
                                        className="h-8 w-20"
                                        disabled={isPlanner}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="hover:bg-destructive/10 group" disabled={isPlanner}>
                                                    <Trash2 className="h-4 w-4 text-muted-foreground group-hover:text-destructive" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete this operation from the part.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteOperation(part.id, opIndex)}>Continue</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                            </Table>
                         </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline" className="mt-2" disabled={isPlanner}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Operation
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Add Operation</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to add a new operation to this part?
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleAddNewOperation(part.id)}>Add Operation</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                   </div>
                </div>
            </AccordionContent>
        </AccordionItem>
    </div>
  );
}


export function PartsManager({ 
    parts, 
    setParts, 
    machines,
    isPlanner = false,
    masterPartsList = [],
    onPartSelectionChange,
    isAdjustingPlan = false
}: PartsManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleAddNewPart = () => {
    const newPart: Part = {
      id: `part-${crypto.randomUUID()}`,
      partName: "New Part Name",
      partDescription: "New Part Number",
      priority: parts.length + 1,
      operations: [
        { stepName: "New Operation", lowestPress: "Press-10T", dieSettingTime: 5, timeFor50Pcs: 10 },
      ],
      quantityToProduce: 100,
    };
    setParts([...parts, newPart]);
  };
  
  const handleRemoveOrDeletePart = (partId: string) => {
    setParts(parts.filter(p => p.id !== partId).map((p, index) => ({...p, priority: index + 1})));
  };

  const handlePartNameChange = (partId: string, newName: string) => {
    setParts(parts.map(p => p.id === partId ? { ...p, partName: newName } : p));
  };

  const handlePartDescriptionChange = (partId: string, newDescription: string) => {
    setParts(parts.map(p => p.id === partId ? { ...p, partDescription: newDescription } : p));
  };
  
  const handleQuantityChange = (partId: string, newQuantity: number) => {
    setParts(parts.map(p => p.id === partId ? { ...p, quantityToProduce: isNaN(newQuantity) ? 0 : Math.max(0, newQuantity) } : p));
  };

  const handleActualQuantityChange = (partId: string, newQuantity: number) => {
    setParts(parts.map(p => p.id === partId ? { ...p, actualQuantityProduced: isNaN(newQuantity) ? 0 : Math.max(0, newQuantity) } : p));
  };

  const handleAddNewOperation = (partId: string) => {
    setParts(parts.map(p => {
      if (p.id === partId) {
        const newOperation: PartOperation = {
          stepName: "New Step",
          lowestPress: "Press-10T",
          dieSettingTime: 5,
          timeFor50Pcs: 10,
        };
        return { ...p, operations: [...p.operations, newOperation] };
      }
      return p;
    }));
  };

  const handleDeleteOperation = (partId: string, opIndex: number) => {
     setParts(parts.map(p => {
      if (p.id === partId) {
        const newOps = p.operations.filter((_, index) => index !== opIndex);
        return { ...p, operations: newOps };
      }
      return p;
    }));
  };

  const handleOperationValueChange = (partId: string, opIndex: number, field: keyof PartOperation, value: string | number) => {
    setParts(parts.map(p => {
      if (p.id === partId) {
        const newOps = [...p.operations];
        const opToChange = { ...newOps[opIndex] };
        
        if (typeof value === 'number' && isNaN(value)) {
            (opToChange as any)[field] = 0;
        } else {
            (opToChange as any)[field] = value;
        }

        newOps[opIndex] = opToChange;
        return { ...p, operations: newOps };
      }
      return p;
    }));
  };

  const handleOperationSelectionChange = (partId: string, opIndex: number, checked: boolean) => {
    setParts(parts.map(p => {
      if (p.id === partId) {
        const masterOp = p.operations[opIndex];
        let newSelectedOps = [...(p.selectedOperations || p.operations)];

        if (checked) {
          // Add if not already present
          if (!newSelectedOps.some(op => op.stepName === masterOp.stepName)) {
            newSelectedOps.push(masterOp);
            // Re-sort to maintain original order
            newSelectedOps.sort((a, b) => {
                const indexA = p.operations.findIndex(op => op.stepName === a.stepName);
                const indexB = p.operations.findIndex(op => op.stepName === b.stepName);
                return indexA - indexB;
            });
          }
        } else {
          // Remove
          newSelectedOps = newSelectedOps.filter(op => op.stepName !== masterOp.stepName);
        }
        return { ...p, selectedOperations: newSelectedOps };
      }
      return p;
    }));
  };
  
  const filteredDataParts = parts.filter(part =>
    (part.partName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (part.partDescription || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMasterPartsList = masterPartsList.filter(p => 
      !parts.some(sp => sp.id === p.id) &&
      (searchQuery === '' || 
        (p.partName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.partDescription || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isPlanner) {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <h3 className="font-semibold text-lg">{isAdjustingPlan ? 'Add or Update Parts' : "Select Parts for Today's Plan"}</h3>
                <p className="text-sm text-muted-foreground">
                    {isAdjustingPlan 
                        ? 'Add new parts, or update quantities and priorities for the adjusted plan.'
                        : 'Search for a part and add it to the schedule below.'
                    }
                </p>
                 <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                            <Search className="mr-2 h-4 w-4" />
                            Search and add part...
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                        className="p-0 w-[--radix-popover-trigger-width] z-50" 
                        align="start"
                        onCloseAutoFocus={(e) => e.preventDefault()}
                    >
                        <div className="p-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Type part name or number..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <ScrollArea className="h-[300px]">
                            <div className="p-1">
                                {filteredMasterPartsList.length === 0 ? (
                                    <p className="py-6 text-center text-sm text-muted-foreground">No parts found.</p>
                                ) : (
                                    filteredMasterPartsList.map((part) => (
                                        <Button
                                            key={part.id}
                                            variant="ghost"
                                            className="w-full justify-start h-auto p-2"
                                            onClick={() => {
                                                if(onPartSelectionChange) {
                                                    onPartSelectionChange(part);
                                                }
                                                setSearchQuery('');
                                                setPopoverOpen(false);
                                            }}
                                        >
                                            <div className="flex flex-col text-left">
                                                <span>{part.partName}</span>
                                                <span className="text-xs text-muted-foreground">{part.partDescription}</span>
                                            </div>
                                        </Button>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </PopoverContent>
                </Popover>
            </div>

             <div className="space-y-2 pt-4">
                <h3 className="font-semibold text-lg">Prioritize Selected Parts</h3>
                <p className="text-sm text-muted-foreground">
                    Drag and drop to re-order. Set the target quantity and enter any actual quantity already produced.
                </p>
            </div>
            <div className="rounded-md border">
                 <Accordion type="multiple" className="w-full">
                    {parts.map((part, index) => (
                        <SortablePartItem
                            key={part.id}
                            part={part}
                            index={index}
                            machines={machines}
                            isPlanner={true}
                            isAdjustingPlan={isAdjustingPlan}
                            handleRemovePart={handleRemoveOrDeletePart}
                            handlePartNameChange={handlePartNameChange}
                            handlePartDescriptionChange={handlePartDescriptionChange}
                            handleQuantityChange={handleQuantityChange}
                            handleActualQuantityChange={handleActualQuantityChange}
                            handleAddNewOperation={handleAddNewOperation}
                            handleDeleteOperation={handleDeleteOperation}
                            handleOperationValueChange={handleOperationValueChange}
                            handleOperationSelectionChange={handleOperationSelectionChange}
                        />
                    ))}
                </Accordion>
            </div>
        </div>
    );
  }


  return (
    <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
             <div className="relative w-full sm:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search parts..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Part
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Add New Part</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to create a new part in the master list?
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAddNewPart}>Create Part</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
      </div>
      <div className="rounded-md border">
        <Accordion type="multiple" className="w-full">
            {filteredDataParts.map((part, index) => (
                <SortablePartItem
                    key={part.id}
                    part={part}
                    index={index}
                    machines={machines}
                    isAdjustingPlan={isAdjustingPlan}
                    handleRemovePart={handleRemoveOrDeletePart}
                    handlePartNameChange={handlePartNameChange}
                    handlePartDescriptionChange={handlePartDescriptionChange}
                    handleQuantityChange={handleQuantityChange}
                    handleActualQuantityChange={handleActualQuantityChange}
                    handleAddNewOperation={handleAddNewOperation}
                    handleDeleteOperation={handleDeleteOperation}
                    handleOperationValueChange={handleOperationValueChange}
                    handleOperationSelectionChange={handleOperationSelectionChange}
                />
            ))}
        </Accordion>
      </div>
    </div>
  );
}
