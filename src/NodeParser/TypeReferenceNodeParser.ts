import * as ts from "typescript";
import { Context, NodeParser } from "../NodeParser";
import { SubNodeParser } from "../SubNodeParser";
import { ArrayType } from "../Type/ArrayType";
import { BaseType } from "../Type/BaseType";
import { UnknownTypeReference } from "../Error/UnknownTypeReference";
import { Config } from "../Config";
import { ignoreLimits } from "../Utils";

const invlidTypes: { [index: number]: boolean } = {
    [ts.SyntaxKind.ModuleDeclaration]: true,
    [ts.SyntaxKind.VariableDeclaration]: true,
};

export class TypeReferenceNodeParser implements SubNodeParser {
    public constructor(
        private typeChecker: ts.TypeChecker,
        private childNodeParser: NodeParser,
        private config: Config
    ) {}

    public supportsNode(node: ts.TypeReferenceNode): boolean {
        return node.kind === ts.SyntaxKind.TypeReference;
    }

    public createType(node: ts.TypeReferenceNode, context: Context): BaseType | undefined {
        const typeSymbol = this.typeChecker.getSymbolAtLocation(node.typeName)!;

        if (!typeSymbol) {
            throw new UnknownTypeReference(node, `are you using global types?`);
        }

        if (typeSymbol.flags & ts.SymbolFlags.Alias) {
            const aliasedSymbol = this.typeChecker.getAliasedSymbol(typeSymbol);
            return this.childNodeParser.createType(
                aliasedSymbol.declarations!.filter((n: ts.Declaration) => !invlidTypes[n.kind])[0],
                this.createSubContext(node, context)
            );
        } else if (typeSymbol.flags & ts.SymbolFlags.TypeParameter) {
            return context.getArgument(typeSymbol.name);
        } else if (typeSymbol.name === "Array" || typeSymbol.name === "ReadonlyArray") {
            const type = this.createSubContext(node, context).getArguments()[0];
            if (type === undefined) {
                return undefined;
            }
            return new ArrayType(type);
        } else {
            return this.childNodeParser.createType(
                typeSymbol.declarations!.filter((n: ts.Declaration) => !invlidTypes[n.kind])[0],
                this.createSubContext(node, context)
            );
        }
    }

    private createSubContext(node: ts.TypeReferenceNode, parentContext: Context): Context {
        // const nodeTopLevelName = getTypeReferenceNodeName(node);
        // const refTopLevelName = getTypeReferenceNodeName(parentContext.getReference());

        const subContext = new Context(node, parentContext);
        subContext.ignoreLimits = parentContext.ignoreLimits;
        // subContext.isRecursion = nodeTopLevelName === refTopLevelName;
        if (node.typeArguments && node.typeArguments.length) {
            for (const typeArg of node.typeArguments) {
                const type = this.childNodeParser.createType(typeArg, parentContext);
                subContext.pushArgument(type);
            }
        }
        return subContext;
    }
}
